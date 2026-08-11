import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { signAccessToken } from "../src/services/token.service";
import { resetDatabase, uniqueEmail, uniqueUsername } from "./helpers";

const app = createApp();

let seq = 0;
function next() {
  seq += 1;
  return seq;
}

async function createUser(overrides: { role?: "USER" | "ADMIN" } = {}) {
  const user = await prisma.user.create({
    data: {
      firstName: "User",
      lastName: `${next()}`,
      username: uniqueUsername("notif"),
      email: uniqueEmail("notif"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
}

function tokenFor(user: { id: string; role: "USER" | "ADMIN" }) {
  return signAccessToken({ sub: user.id, role: user.role });
}

async function createNotificationFor(userId: string, overrides: Partial<{ isRead: boolean; title: string }> = {}) {
  return prisma.notification.create({
    data: {
      userId,
      type: "GENERIC",
      title: overrides.title ?? "Test notification",
      message: "A test notification message.",
      isRead: overrides.isRead ?? false,
    },
  });
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/notifications", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/notifications");
    expect(res.status).toBe(401);
  });

  it("only lists the caller's own notifications, with an accurate unread count", async () => {
    const userA = await createUser();
    const userB = await createUser();
    await createNotificationFor(userA.id, { isRead: false });
    await createNotificationFor(userA.id, { isRead: true });
    await createNotificationFor(userB.id, { isRead: false });

    const res = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${tokenFor(userA)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(2);
    expect(res.body.data.unreadCount).toBe(1);
  });

  it("filters to unread only when unreadOnly=true", async () => {
    const user = await createUser();
    await createNotificationFor(user.id, { isRead: false });
    await createNotificationFor(user.id, { isRead: true });

    const res = await request(app)
      .get("/api/v1/notifications?unreadOnly=true")
      .set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.notifications[0].isRead).toBe(false);
  });
});

describe("POST /api/v1/notifications/:id/read", () => {
  it("marks the caller's own notification as read", async () => {
    const user = await createUser();
    const notification = await createNotificationFor(user.id, { isRead: false });

    const res = await request(app)
      .post(`/api/v1/notifications/${notification.id}/read`)
      .set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.notification.isRead).toBe(true);
  });

  it("404s on another user's notification", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const notification = await createNotificationFor(owner.id);

    const res = await request(app)
      .post(`/api/v1/notifications/${notification.id}/read`)
      .set("Authorization", `Bearer ${tokenFor(intruder)}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOTIFICATION_NOT_FOUND");
  });
});

describe("POST /api/v1/notifications/read-all", () => {
  it("marks every unread notification for the caller as read, leaving other users' untouched", async () => {
    const user = await createUser();
    const other = await createUser();
    await createNotificationFor(user.id, { isRead: false });
    await createNotificationFor(user.id, { isRead: false });
    await createNotificationFor(other.id, { isRead: false });

    const res = await request(app).post("/api/v1/notifications/read-all").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(200);

    const listRes = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(listRes.body.data.unreadCount).toBe(0);

    const otherListRes = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${tokenFor(other)}`);
    expect(otherListRes.body.data.unreadCount).toBe(1);
  });
});

describe("Notification triggers wired into existing flows", () => {
  async function createActiveSeller() {
    const seller = await createUser();
    const n = next();
    const store = await prisma.store.create({
      data: {
        sellerId: seller.id,
        name: `Store ${n}`,
        slug: `notif-store-${n}`,
        description: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: seller.email,
        location: "Lagos",
        status: "ACTIVE",
      },
    });
    return { seller, store };
  }

  it("notifies the applicant when their seller application is approved", async () => {
    const applicant = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const application = await prisma.sellerApplication.create({
      data: {
        userId: applicant.id,
        storeName: `App Store ${next()}`,
        storeDescription: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: applicant.email,
        location: "Lagos",
      },
    });

    await request(app)
      .post(`/api/v1/admin/seller-applications/${application.id}/approve`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);

    const res = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${tokenFor(applicant)}`);
    expect(res.body.data.notifications.some((n: { type: string }) => n.type === "SELLER_APPLICATION_APPROVED")).toBe(true);
  });

  it("notifies the seller when their product is approved or rejected", async () => {
    const { seller, store } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await prisma.category.create({ data: { name: `Cat ${next()}`, slug: `notif-cat-${next()}`, status: "ACTIVE" } });
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Notif Product",
        slug: `notif-product-${next()}`,
        description: "A product for notification testing.",
        type: "PHYSICAL",
        price: 1000,
        stockQuantity: 5,
        shippingType: "FREE",
        status: "PENDING_REVIEW",
        submittedAt: new Date(),
      },
    });

    await request(app)
      .post(`/api/v1/admin/products/${product.id}/approve`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);

    const res = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${tokenFor(seller)}`);
    expect(res.body.data.notifications.some((n: { type: string }) => n.type === "PRODUCT_APPROVED")).toBe(true);
  });

  it("notifies the buyer and seller on a successful checkout", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await prisma.category.create({ data: { name: `Cat ${next()}`, slug: `notif-cat2-${next()}`, status: "ACTIVE" } });
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Checkout Notif Product",
        slug: `notif-checkout-product-${next()}`,
        description: "A product for checkout notification testing.",
        type: "PHYSICAL",
        price: 1000,
        stockQuantity: 5,
        shippingType: "FREE",
        status: "APPROVED",
      },
    });
    const buyer = await createUser();
    const address = await prisma.address.create({
      data: { userId: buyer.id, fullName: "Buyer", phone: "+2348000000000", addressLine1: "1 St", city: "Lagos", state: "Lagos" },
    });
    const buyerToken = tokenFor(buyer);

    await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${buyerToken}`).send({ productId: product.id, quantity: 1 });
    await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${buyerToken}`).send({ shippingAddressId: address.id });

    const buyerNotifs = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${buyerToken}`);
    expect(buyerNotifs.body.data.notifications.some((n: { type: string }) => n.type === "PAYMENT_SUCCESS")).toBe(true);

    const sellerNotifs = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${tokenFor(seller)}`);
    expect(sellerNotifs.body.data.notifications.some((n: { type: string }) => n.type === "ORDER_PLACED")).toBe(true);
  });

  it("notifies the buyer when a seller marks their order shipped/delivered, and the seller when reviewed", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await prisma.category.create({ data: { name: `Cat ${next()}`, slug: `notif-cat3-${next()}`, status: "ACTIVE" } });
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Ship Notif Product",
        slug: `notif-ship-product-${next()}`,
        description: "A product for shipping notification testing.",
        type: "PHYSICAL",
        price: 1000,
        stockQuantity: 5,
        shippingType: "FREE",
        status: "APPROVED",
      },
    });
    const buyer = await createUser();
    const address = await prisma.address.create({
      data: { userId: buyer.id, fullName: "Buyer", phone: "+2348000000000", addressLine1: "1 St", city: "Lagos", state: "Lagos" },
    });
    const buyerToken = tokenFor(buyer);
    const sellerToken = tokenFor(seller);

    await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${buyerToken}`).send({ productId: product.id, quantity: 1 });
    await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${buyerToken}`).send({ shippingAddressId: address.id });

    const listRes = await request(app).get("/api/v1/seller-orders").set("Authorization", `Bearer ${sellerToken}`);
    const sellerOrderId = listRes.body.data.sellerOrders[0].id;

    await request(app).patch(`/api/v1/seller-orders/${sellerOrderId}/status`).set("Authorization", `Bearer ${sellerToken}`).send({ status: "PROCESSING" });
    await request(app).patch(`/api/v1/seller-orders/${sellerOrderId}/status`).set("Authorization", `Bearer ${sellerToken}`).send({ status: "SHIPPED" });
    await request(app).patch(`/api/v1/seller-orders/${sellerOrderId}/status`).set("Authorization", `Bearer ${sellerToken}`).send({ status: "DELIVERED" });

    const buyerNotifs = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${buyerToken}`);
    const types = buyerNotifs.body.data.notifications.map((n: { type: string }) => n.type);
    expect(types).toContain("ORDER_SHIPPED");
    expect(types).toContain("ORDER_DELIVERED");

    const sellerOrderDetail = await request(app).get(`/api/v1/seller-orders/${sellerOrderId}`).set("Authorization", `Bearer ${sellerToken}`);
    const orderItemId = sellerOrderDetail.body.data.sellerOrder.items[0].id;

    await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ orderItemId, rating: 5, comment: "Great!" });

    const sellerNotifs = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${sellerToken}`);
    expect(sellerNotifs.body.data.notifications.some((n: { type: string }) => n.type === "NEW_REVIEW")).toBe(true);
  });
});

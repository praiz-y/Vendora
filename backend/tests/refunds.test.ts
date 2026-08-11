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
      username: uniqueUsername("refund"),
      email: uniqueEmail("refund"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
}

async function createActiveSeller() {
  const seller = await createUser();
  const n = next();
  const store = await prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `Store ${n}`,
      slug: `refund-store-${n}`,
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

async function createCategory() {
  const n = next();
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `refund-category-${n}`, status: "ACTIVE" } });
}

async function createPhysicalProduct(storeId: string, categoryId: string, price = 1000) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Product ${n}`,
      slug: `refund-product-${n}`,
      description: "A product for refund testing.",
      type: "PHYSICAL",
      price,
      stockQuantity: 10,
      shippingType: "FREE",
      status: "APPROVED",
    },
  });
}

async function createAddress(userId: string) {
  const n = next();
  return prisma.address.create({
    data: { userId, fullName: `Buyer ${n}`, phone: "+2348000000000", addressLine1: "1 Test Street", city: "Lagos", state: "Lagos" },
  });
}

function tokenFor(user: { id: string; role: "USER" | "ADMIN" }) {
  return signAccessToken({ sub: user.id, role: user.role });
}

async function addToCart(token: string, productId: string, quantity = 1) {
  await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${token}`).send({ productId, quantity });
}

async function checkout(token: string, addressId: string, simulateFailure = false) {
  const res = await request(app)
    .post("/api/v1/checkout")
    .set("Authorization", `Bearer ${token}`)
    .send({ shippingAddressId: addressId, simulateFailure });
  return res.body.data.order;
}

async function getFirstSellerOrderId(sellerToken: string) {
  const res = await request(app).get("/api/v1/seller-orders").set("Authorization", `Bearer ${sellerToken}`);
  return res.body.data.sellerOrders[0].id as string;
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/v1/refunds", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/v1/refunds").send({ sellerOrderId: "x", reason: "Not as described" });
    expect(res.status).toBe(401);
  });

  it("404s a seller-order belonging to a different buyer", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();
    const intruder = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await addToCart(buyerToken, product.id);
    await checkout(buyerToken, address.id);
    const sellerOrderId = await getFirstSellerOrderId(tokenFor(seller));

    const res = await request(app)
      .post("/api/v1/refunds")
      .set("Authorization", `Bearer ${tokenFor(intruder)}`)
      .send({ sellerOrderId, reason: "Not as described" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SELLER_ORDER_NOT_FOUND");
  });

  it("rejects a refund request for an order that never got paid", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await addToCart(buyerToken, product.id);
    const order = await checkout(buyerToken, address.id, true);
    expect(order.status).toBe("PENDING_PAYMENT");
    const sellerOrderId = await getFirstSellerOrderId(tokenFor(seller));

    const res = await request(app)
      .post("/api/v1/refunds")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ sellerOrderId, reason: "Changed my mind" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ORDER_NOT_PAID");
  });

  it("creates a refund request for the seller-order's full total, and rejects a duplicate active request", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, 1000);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await addToCart(buyerToken, product.id, 2);
    await checkout(buyerToken, address.id);
    const sellerOrderId = await getFirstSellerOrderId(tokenFor(seller));

    const res = await request(app)
      .post("/api/v1/refunds")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ sellerOrderId, reason: "Item arrived damaged" });
    expect(res.status).toBe(201);
    expect(res.body.data.refund.status).toBe("REQUESTED");
    expect(Number(res.body.data.refund.amount)).toBe(2000);

    const dupe = await request(app)
      .post("/api/v1/refunds")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ sellerOrderId, reason: "Still waiting" });
    expect(dupe.status).toBe(409);
    expect(dupe.body.error.code).toBe("REFUND_ALREADY_REQUESTED");
  });
});

describe("GET /api/v1/refunds/me", () => {
  it("only lists the caller's own refund requests", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const productA = await createPhysicalProduct(store.id, category.id);
    const buyerA = await createUser();
    const buyerB = await createUser();
    const addressA = await createAddress(buyerA.id);
    const tokenA = tokenFor(buyerA);

    await addToCart(tokenA, productA.id);
    await checkout(tokenA, addressA.id);
    const sellerOrderId = await getFirstSellerOrderId(tokenFor(seller));
    await request(app).post("/api/v1/refunds").set("Authorization", `Bearer ${tokenA}`).send({ sellerOrderId, reason: "Wrong item" });

    const resA = await request(app).get("/api/v1/refunds/me").set("Authorization", `Bearer ${tokenA}`);
    expect(resA.body.data.refunds).toHaveLength(1);

    const resB = await request(app).get("/api/v1/refunds/me").set("Authorization", `Bearer ${tokenFor(buyerB)}`);
    expect(resB.body.data.refunds).toHaveLength(0);
  });
});

describe("Admin refund review", () => {
  it("requires admin access", async () => {
    const user = await createUser();
    const res = await request(app).get("/api/v1/admin/refunds").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(403);
  });

  it("approves a refund: processes it, marks the Payment REFUNDED (single-seller order), and notifies the buyer", async () => {
    const { seller, store } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, 1500);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await addToCart(buyerToken, product.id);
    const order = await checkout(buyerToken, address.id);
    const sellerOrderId = await getFirstSellerOrderId(tokenFor(seller));
    const createRes = await request(app)
      .post("/api/v1/refunds")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ sellerOrderId, reason: "Item never arrived" });
    const refundId = createRes.body.data.refund.id;

    const approveRes = await request(app)
      .post(`/api/v1/admin/refunds/${refundId}/approve`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.refund.status).toBe("PROCESSED");
    expect(approveRes.body.data.refund.providerRefundReference).toBeTruthy();

    const orderDetail = await request(app).get(`/api/v1/orders/${order.id}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(orderDetail.body.data.order.payment.status).toBe("REFUNDED");

    const notifs = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${buyerToken}`);
    expect(notifs.body.data.notifications.some((n: { type: string }) => n.type === "REFUND_UPDATE")).toBe(true);

    // Already processed — can't be approved again.
    const again = await request(app)
      .post(`/api/v1/admin/refunds/${refundId}/approve`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("REFUND_NOT_REQUESTED");
  });

  it("rejects a refund, and a rejected request doesn't block a new one for the same seller-order", async () => {
    const { seller, store } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await addToCart(buyerToken, product.id);
    await checkout(buyerToken, address.id);
    const sellerOrderId = await getFirstSellerOrderId(tokenFor(seller));
    const createRes = await request(app)
      .post("/api/v1/refunds")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ sellerOrderId, reason: "Not as described" });
    const refundId = createRes.body.data.refund.id;

    const rejectRes = await request(app)
      .post(`/api/v1/admin/refunds/${refundId}/reject`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ reviewNote: "Item matches the listing photos." });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.refund.status).toBe("REJECTED");

    const secondRes = await request(app)
      .post("/api/v1/refunds")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ sellerOrderId, reason: "Escalating — still unhappy" });
    expect(secondRes.status).toBe(201);
  });

  it("marks the Payment PARTIALLY_REFUNDED when only one of two seller-orders is refunded", async () => {
    const { seller: sellerA, store: storeA } = await createActiveSeller();
    const { store: storeB } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory();
    const productA = await createPhysicalProduct(storeA.id, category.id, 1000);
    const productB = await createPhysicalProduct(storeB.id, category.id, 500);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await addToCart(buyerToken, productA.id);
    await addToCart(buyerToken, productB.id);
    const order = await checkout(buyerToken, address.id);

    const sellerOrderIdA = await getFirstSellerOrderId(tokenFor(sellerA));
    const createRes = await request(app)
      .post("/api/v1/refunds")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ sellerOrderId: sellerOrderIdA, reason: "Only this item was wrong" });

    await request(app)
      .post(`/api/v1/admin/refunds/${createRes.body.data.refund.id}/approve`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);

    const orderDetail = await request(app).get(`/api/v1/orders/${order.id}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(orderDetail.body.data.order.payment.status).toBe("PARTIALLY_REFUNDED");
  });
});

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
      username: uniqueUsername("sdash"),
      email: uniqueEmail("sdash"),
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
      slug: `sdash-store-${n}`,
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
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `sdash-category-${n}`, status: "ACTIVE" } });
}

async function createPhysicalProduct(storeId: string, categoryId: string, price = 1000) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Product ${n}`,
      slug: `sdash-product-${n}`,
      description: "A product for seller-dashboard testing.",
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

async function placeOrder(token: string, productId: string, quantity: number, addressId: string) {
  await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${token}`).send({ productId, quantity });
  const res = await request(app)
    .post("/api/v1/checkout")
    .set("Authorization", `Bearer ${token}`)
    .send({ shippingAddressId: addressId });
  return res.body.data.order;
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/seller-dashboard/overview", () => {
  it("requires an active seller capability", async () => {
    const buyer = await createUser();
    const res = await request(app).get("/api/v1/seller-dashboard/overview").set("Authorization", `Bearer ${tokenFor(buyer)}`);
    expect(res.status).toBe(403);
  });

  it("counts products by status, orders by status, and only counts revenue from paid orders", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const approved = await createPhysicalProduct(store.id, category.id, 1000);
    await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Draft product",
        slug: `sdash-draft-${next()}`,
        description: "Not submitted yet.",
        type: "PHYSICAL",
        price: 500,
        stockQuantity: 5,
        shippingType: "FREE",
        status: "DRAFT",
      },
    });

    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const order = await placeOrder(tokenFor(buyer), approved.id, 2, address.id);
    expect(order.status).toBe("PAID");

    const res = await request(app)
      .get("/api/v1/seller-dashboard/overview")
      .set("Authorization", `Bearer ${tokenFor(seller)}`);
    expect(res.status).toBe(200);
    const { overview } = res.body.data;

    expect(overview.products.total).toBe(2);
    expect(overview.products.byStatus.APPROVED).toBe(1);
    expect(overview.products.byStatus.DRAFT).toBe(1);
    expect(overview.orders.total).toBe(1);
    expect(overview.orders.byStatus.PENDING).toBe(1);
    expect(Number(overview.totalRevenue)).toBe(2000);
    expect(overview.recentOrders).toHaveLength(1);
  });

  it("excludes a failed (still PENDING_PAYMENT) checkout's revenue", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, 1000);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${buyerToken}`).send({ productId: product.id, quantity: 1 });
    const checkoutRes = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ shippingAddressId: address.id, simulateFailure: true });
    expect(checkoutRes.body.data.order.status).toBe("PENDING_PAYMENT");

    const res = await request(app)
      .get("/api/v1/seller-dashboard/overview")
      .set("Authorization", `Bearer ${tokenFor(seller)}`);
    expect(Number(res.body.data.overview.totalRevenue)).toBe(0);
    // The SellerOrder itself still exists (created before payment was attempted).
    expect(res.body.data.overview.orders.total).toBe(1);
  });
});

describe("GET /api/v1/seller-dashboard/analytics", () => {
  it("reports per-product views, units sold, and revenue, and excludes other sellers' products", async () => {
    const { seller: sellerA, store: storeA } = await createActiveSeller();
    const { store: storeB } = await createActiveSeller();
    const category = await createCategory();
    const productA = await createPhysicalProduct(storeA.id, category.id, 500);
    const productB = await createPhysicalProduct(storeB.id, category.id, 900);

    await request(app).post(`/api/v1/marketplace/products/${productA.slug}/view`).send({ visitorId: "v1" });
    await request(app).post(`/api/v1/marketplace/products/${productA.slug}/view`).send({ visitorId: "v2" });
    await request(app).post(`/api/v1/marketplace/products/${productB.slug}/view`).send({ visitorId: "v3" });

    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    await placeOrder(tokenFor(buyer), productA.id, 3, address.id);

    const res = await request(app)
      .get("/api/v1/seller-dashboard/analytics")
      .set("Authorization", `Bearer ${tokenFor(sellerA)}`);
    expect(res.status).toBe(200);
    const { analytics } = res.body.data;

    expect(analytics.perProduct).toHaveLength(1);
    const entry = analytics.perProduct[0];
    expect(entry.productId).toBe(productA.id);
    expect(entry.views).toBe(2);
    expect(entry.unitsSold).toBe(3);
    expect(Number(entry.revenue)).toBe(1500);

    expect(analytics.totals.views).toBe(2);
    expect(analytics.totals.unitsSold).toBe(3);
    expect(Number(analytics.totals.revenue)).toBe(1500);
  });
});

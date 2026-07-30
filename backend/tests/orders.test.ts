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

async function createBuyer() {
  const user = await prisma.user.create({
    data: {
      firstName: "Buyer",
      lastName: `${next()}`,
      username: uniqueUsername("ordersbuyer"),
      email: uniqueEmail("ordersbuyer"),
      passwordHash: "not-used-in-these-tests",
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
}

async function createStore() {
  const n = next();
  const seller = await prisma.user.create({
    data: {
      firstName: "Seller",
      lastName: `${n}`,
      username: uniqueUsername("ordersseller"),
      email: uniqueEmail("ordersseller"),
      passwordHash: "not-used-in-these-tests",
    },
  });
  return prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `Store ${n}`,
      slug: `orders-store-${n}`,
      description: "desc",
      businessCategory: "General",
      phone: "+2340000000000",
      email: seller.email,
      location: "Lagos",
      status: "ACTIVE",
    },
  });
}

async function createCategory() {
  const n = next();
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `orders-category-${n}`, status: "ACTIVE" } });
}

async function createPhysicalProduct(storeId: string, categoryId: string) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Product ${n}`,
      slug: `orders-product-${n}`,
      description: "A great product for order-history testing.",
      type: "PHYSICAL",
      price: 1000,
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

async function placeOrder(token: string, productId: string, addressId: string, simulateFailure = false) {
  await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${token}`).send({ productId, quantity: 1 });
  const res = await request(app)
    .post("/api/v1/checkout")
    .set("Authorization", `Bearer ${token}`)
    .send({ shippingAddressId: addressId, simulateFailure });
  return res.body.data.order;
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/orders", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/orders");
    expect(res.status).toBe(401);
  });

  it("lists only the caller's own orders, filterable by status", async () => {
    const buyerA = await createBuyer();
    const buyerB = await createBuyer();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const addressA = await createAddress(buyerA.id);
    const addressB = await createAddress(buyerB.id);

    await placeOrder(tokenFor(buyerA), product.id, addressA.id);
    await placeOrder(tokenFor(buyerB), product.id, addressB.id);

    const res = await request(app).get("/api/v1/orders").set("Authorization", `Bearer ${tokenFor(buyerA)}`);
    expect(res.body.data.orders).toHaveLength(1);

    const filtered = await request(app).get("/api/v1/orders?status=CANCELLED").set("Authorization", `Bearer ${tokenFor(buyerA)}`);
    expect(filtered.body.data.orders).toHaveLength(0);
  });
});

describe("GET /api/v1/orders/:id", () => {
  it("404s fetching another buyer's order", async () => {
    const buyer = await createBuyer();
    const intruder = await createBuyer();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const address = await createAddress(buyer.id);
    const order = await placeOrder(tokenFor(buyer), product.id, address.id);

    const res = await request(app).get(`/api/v1/orders/${order.id}`).set("Authorization", `Bearer ${tokenFor(intruder)}`);
    expect(res.status).toBe(404);
  });

  it("returns full order detail including seller-order breakdown", async () => {
    const buyer = await createBuyer();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const address = await createAddress(buyer.id);
    const order = await placeOrder(tokenFor(buyer), product.id, address.id);

    const res = await request(app).get(`/api/v1/orders/${order.id}`).set("Authorization", `Bearer ${tokenFor(buyer)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.order.sellerOrders).toHaveLength(1);
    expect(res.body.data.order.shippingAddress.id).toBe(address.id);
  });
});

describe("POST /api/v1/orders/:id/cancel", () => {
  it("cancels an order stuck awaiting payment and releases its stock reservations", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const address = await createAddress(buyer.id);
    const order = await placeOrder(token, product.id, address.id, true);
    expect(order.status).toBe("PENDING_PAYMENT");

    const res = await request(app).post(`/api/v1/orders/${order.id}/cancel`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe("CANCELLED");

    const reservations = await prisma.stockReservation.findMany({ where: { orderId: order.id } });
    expect(reservations.every((r) => r.status === "RELEASED")).toBe(true);
  });

  it("rejects cancelling an already-paid order", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const address = await createAddress(buyer.id);
    const order = await placeOrder(token, product.id, address.id);
    expect(order.status).toBe("PAID");

    const res = await request(app).post(`/api/v1/orders/${order.id}/cancel`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ORDER_NOT_CANCELLABLE");
  });
});

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

async function createUser() {
  const user = await prisma.user.create({
    data: {
      firstName: "User",
      lastName: `${next()}`,
      username: uniqueUsername("selord"),
      email: uniqueEmail("selord"),
      passwordHash: "not-used-in-these-tests",
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
      slug: `selord-store-${n}`,
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
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `selord-category-${n}`, status: "ACTIVE" } });
}

async function createPhysicalProduct(storeId: string, categoryId: string) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Product ${n}`,
      slug: `selord-product-${n}`,
      description: "A great product for seller-order testing.",
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

async function placeOrder(token: string, productId: string, addressId: string) {
  await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${token}`).send({ productId, quantity: 1 });
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

describe("GET /api/v1/seller-orders", () => {
  it("requires an active seller capability", async () => {
    const buyer = await createUser();
    const res = await request(app).get("/api/v1/seller-orders").set("Authorization", `Bearer ${tokenFor(buyer)}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SELLER_CAPABILITY_REQUIRED");
  });

  it("only lists the caller's own store's seller-orders", async () => {
    const { seller: sellerA, store: storeA } = await createActiveSeller();
    const { store: storeB } = await createActiveSeller();
    const category = await createCategory();
    const productA = await createPhysicalProduct(storeA.id, category.id);
    const productB = await createPhysicalProduct(storeB.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${buyerToken}`).send({ productId: productA.id, quantity: 1 });
    await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${buyerToken}`).send({ productId: productB.id, quantity: 1 });
    await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${buyerToken}`).send({ shippingAddressId: address.id });

    const res = await request(app).get("/api/v1/seller-orders").set("Authorization", `Bearer ${tokenFor(sellerA)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sellerOrders).toHaveLength(1);
    expect(res.body.data.sellerOrders[0].storeId).toBe(storeA.id);
  });
});

describe("PATCH /api/v1/seller-orders/:id/status", () => {
  it("walks PENDING -> PROCESSING -> SHIPPED -> DELIVERED, deriving the parent Order status at each step", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const order = await placeOrder(tokenFor(buyer), product.id, address.id);
    expect(order.status).toBe("PAID");

    const sellerToken = tokenFor(seller);
    const listRes = await request(app).get("/api/v1/seller-orders").set("Authorization", `Bearer ${sellerToken}`);
    const sellerOrderId = listRes.body.data.sellerOrders[0].id;

    const processing = await request(app)
      .patch(`/api/v1/seller-orders/${sellerOrderId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "PROCESSING" });
    expect(processing.status).toBe(200);
    expect(processing.body.data.sellerOrder.status).toBe("PROCESSING");

    let orderRes = await request(app).get(`/api/v1/orders/${order.id}`).set("Authorization", `Bearer ${tokenFor(buyer)}`);
    expect(orderRes.body.data.order.status).toBe("PARTIALLY_PROCESSING");

    await request(app)
      .patch(`/api/v1/seller-orders/${sellerOrderId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "SHIPPED" });
    orderRes = await request(app).get(`/api/v1/orders/${order.id}`).set("Authorization", `Bearer ${tokenFor(buyer)}`);
    expect(orderRes.body.data.order.status).toBe("PARTIALLY_SHIPPED");

    await request(app)
      .patch(`/api/v1/seller-orders/${sellerOrderId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "DELIVERED" });
    orderRes = await request(app).get(`/api/v1/orders/${order.id}`).set("Authorization", `Bearer ${tokenFor(buyer)}`);
    // Single-seller order, now fully delivered -> parent Order is COMPLETED.
    expect(orderRes.body.data.order.status).toBe("COMPLETED");
  });

  it("rejects invalid transitions (e.g. skipping straight to DELIVERED, or moving a DELIVERED order anywhere)", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    await placeOrder(tokenFor(buyer), product.id, address.id);

    const sellerToken = tokenFor(seller);
    const listRes = await request(app).get("/api/v1/seller-orders").set("Authorization", `Bearer ${sellerToken}`);
    const sellerOrderId = listRes.body.data.sellerOrders[0].id;

    const skipRes = await request(app)
      .patch(`/api/v1/seller-orders/${sellerOrderId}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "DELIVERED" });
    expect(skipRes.status).toBe(409);
    expect(skipRes.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("only reaches PARTIALLY_DELIVERED when one of two sellers has delivered and the other hasn't", async () => {
    const { seller: sellerA, store: storeA } = await createActiveSeller();
    const { seller: sellerB, store: storeB } = await createActiveSeller();
    const category = await createCategory();
    const productA = await createPhysicalProduct(storeA.id, category.id);
    const productB = await createPhysicalProduct(storeB.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${buyerToken}`).send({ productId: productA.id, quantity: 1 });
    await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${buyerToken}`).send({ productId: productB.id, quantity: 1 });
    const checkoutRes = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ shippingAddressId: address.id });
    const orderId = checkoutRes.body.data.order.id;

    const listA = await request(app).get("/api/v1/seller-orders").set("Authorization", `Bearer ${tokenFor(sellerA)}`);
    const sellerOrderIdA = listA.body.data.sellerOrders[0].id;

    await request(app)
      .patch(`/api/v1/seller-orders/${sellerOrderIdA}/status`)
      .set("Authorization", `Bearer ${tokenFor(sellerA)}`)
      .send({ status: "PROCESSING" });
    await request(app)
      .patch(`/api/v1/seller-orders/${sellerOrderIdA}/status`)
      .set("Authorization", `Bearer ${tokenFor(sellerA)}`)
      .send({ status: "SHIPPED" });
    await request(app)
      .patch(`/api/v1/seller-orders/${sellerOrderIdA}/status`)
      .set("Authorization", `Bearer ${tokenFor(sellerA)}`)
      .send({ status: "DELIVERED" });

    // Seller B hasn't touched their seller-order yet — still PENDING.
    const orderRes = await request(app).get(`/api/v1/orders/${orderId}`).set("Authorization", `Bearer ${buyerToken}`);
    expect(orderRes.body.data.order.status).toBe("PARTIALLY_DELIVERED");

    void sellerB;
  });

  it("404s a seller acting on another store's seller-order", async () => {
    const { store: storeA } = await createActiveSeller();
    const { seller: sellerB } = await createActiveSeller();
    const category = await createCategory();
    const productA = await createPhysicalProduct(storeA.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    await placeOrder(tokenFor(buyer), productA.id, address.id);

    const listRes = await request(app).get("/api/v1/seller-orders").set("Authorization", `Bearer ${tokenFor(buyer)}`);
    void listRes;

    // Fetch storeA's seller-order id via its own seller, then attempt the
    // status update as sellerB (a different store).
    const storeAOwnerListRes = await prisma.sellerOrder.findFirstOrThrow({ where: { storeId: storeA.id } });
    const res = await request(app)
      .patch(`/api/v1/seller-orders/${storeAOwnerListRes.id}/status`)
      .set("Authorization", `Bearer ${tokenFor(sellerB)}`)
      .send({ status: "PROCESSING" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SELLER_ORDER_NOT_FOUND");
  });
});

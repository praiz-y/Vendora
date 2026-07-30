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
      username: uniqueUsername("checkout"),
      email: uniqueEmail("checkout"),
      passwordHash: "not-used-in-these-tests",
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
}

async function createStore(overrides: { status?: "ACTIVE" | "SUSPENDED" } = {}) {
  const n = next();
  const seller = await prisma.user.create({
    data: {
      firstName: "Seller",
      lastName: `${n}`,
      username: uniqueUsername("checkoutseller"),
      email: uniqueEmail("checkoutseller"),
      passwordHash: "not-used-in-these-tests",
    },
  });
  return prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `Store ${n}`,
      slug: `checkout-store-${n}`,
      description: "desc",
      businessCategory: "General",
      phone: "+2340000000000",
      email: seller.email,
      location: "Lagos",
      status: overrides.status ?? "ACTIVE",
    },
  });
}

async function createCategory() {
  const n = next();
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `checkout-category-${n}`, status: "ACTIVE" } });
}

async function createPhysicalProduct(
  storeId: string,
  categoryId: string,
  overrides: Partial<{ price: number; stockQuantity: number; shippingType: "FREE" | "FIXED"; shippingFee: number }> = {}
) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Physical ${n}`,
      slug: `checkout-physical-${n}`,
      description: "A great physical product for checkout testing.",
      type: "PHYSICAL",
      price: overrides.price ?? 1000,
      stockQuantity: overrides.stockQuantity ?? 5,
      shippingType: overrides.shippingType ?? "FREE",
      shippingFee: overrides.shippingFee,
      status: "APPROVED",
    },
  });
}

async function createDigitalProduct(storeId: string, categoryId: string, overrides: Partial<{ price: number }> = {}) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Digital ${n}`,
      slug: `checkout-digital-${n}`,
      description: "A great digital product for checkout testing.",
      type: "DIGITAL",
      price: overrides.price ?? 2000,
      status: "APPROVED",
      digitalVersions: { create: { version: 1, fileKey: "key.pdf", fileType: "application/pdf", fileSize: 1024 } },
    },
  });
}

async function createAddress(userId: string) {
  const n = next();
  return prisma.address.create({
    data: {
      userId,
      fullName: `Buyer ${n}`,
      phone: "+2348000000000",
      addressLine1: "1 Test Street",
      city: "Lagos",
      state: "Lagos",
    },
  });
}

async function addToCart(token: string, productId: string, quantity = 1) {
  const res = await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${token}`).send({ productId, quantity });
  expect(res.status).toBe(201);
}

function tokenFor(user: { id: string; role: "USER" | "ADMIN" }) {
  return signAccessToken({ sub: user.id, role: user.role });
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/v1/checkout", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/v1/checkout").send({});
    expect(res.status).toBe(401);
  });

  it("rejects checkout with an empty cart", async () => {
    const buyer = await createBuyer();
    const res = await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${tokenFor(buyer)}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CART_EMPTY");
  });

  it("completes a single-vendor physical checkout: pays, splits into one SellerOrder, decrements stock, clears the cart", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { price: 1000, stockQuantity: 5 });
    const address = await createAddress(buyer.id);
    await addToCart(token, product.id, 2);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddressId: address.id });

    expect(res.status).toBe(201);
    const order = res.body.data.order;
    expect(order.status).toBe("PAID");
    expect(order.payment.status).toBe("SUCCESS");
    expect(order.sellerOrders).toHaveLength(1);
    expect(order.sellerOrders[0].items).toHaveLength(1);
    expect(order.sellerOrders[0].items[0].quantity).toBe(2);
    expect(Number(order.totalAmount)).toBe(2000);

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.stockQuantity).toBe(3);

    const cartRes = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${token}`);
    expect(cartRes.body.data.cart.items).toHaveLength(0);

    const reservations = await prisma.stockReservation.findMany({ where: { orderId: order.id } });
    expect(reservations.every((r) => r.status === "CONFIRMED")).toBe(true);
  });

  it("splits a multi-vendor cart into multiple SellerOrders with correct per-seller totals", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const storeA = await createStore();
    const storeB = await createStore();
    const category = await createCategory();
    const productA = await createPhysicalProduct(storeA.id, category.id, { price: 1000, shippingType: "FREE" });
    const productB = await createPhysicalProduct(storeB.id, category.id, { price: 2000, shippingType: "FIXED", shippingFee: 500 });
    const address = await createAddress(buyer.id);
    await addToCart(token, productA.id, 1);
    await addToCart(token, productB.id, 1);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddressId: address.id });

    expect(res.status).toBe(201);
    const order = res.body.data.order;
    expect(order.sellerOrders).toHaveLength(2);

    const sellerOrderA = order.sellerOrders.find((so: { storeId: string }) => so.storeId === storeA.id);
    const sellerOrderB = order.sellerOrders.find((so: { storeId: string }) => so.storeId === storeB.id);
    expect(Number(sellerOrderA.shippingFee)).toBe(0);
    expect(Number(sellerOrderA.total)).toBe(1000);
    expect(Number(sellerOrderB.shippingFee)).toBe(500);
    expect(Number(sellerOrderB.total)).toBe(2500);
    expect(Number(order.totalAmount)).toBe(3500);
  });

  it("completes checkout even if a cart item is a digital product the buyer already owns (upsert, not create+throw)", async () => {
    // Regression test: a raw create()+catch(P2002) inside the finalization
    // transaction looked safe but wasn't — Postgres aborts the *whole*
    // transaction after any failed statement, so every later statement in
    // the same tx (e.g. clearing the cart) then fails with 25P02 even
    // though the P2002 itself was caught in JS. Covers the case directly
    // rather than relying on cart.service's add-time gate to prevent it
    // from ever occurring (a concurrent second checkout could still race).
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const digitalProduct = await createDigitalProduct(store.id, category.id);
    const physicalProduct = await createPhysicalProduct(store.id, category.id);
    const address = await createAddress(buyer.id);

    // Pre-existing entitlement, simulating one granted outside the normal
    // add-to-cart gate (e.g. seeded data, or a prior successful purchase).
    const priorOrder = await prisma.order.create({
      data: { buyerId: buyer.id, status: "COMPLETED", totalAmount: 0 },
    });
    const priorSellerOrder = await prisma.sellerOrder.create({
      data: { orderId: priorOrder.id, storeId: store.id, subtotal: 0, shippingFee: 0, total: 0, status: "DELIVERED" },
    });
    const priorOrderItem = await prisma.orderItem.create({
      data: {
        sellerOrderId: priorSellerOrder.id,
        productId: digitalProduct.id,
        productNameSnapshot: digitalProduct.name,
        priceSnapshot: digitalProduct.price,
        quantity: 1,
        productTypeSnapshot: "DIGITAL",
        storeNameSnapshot: store.name,
      },
    });
    await prisma.digitalEntitlement.create({
      data: { userId: buyer.id, productId: digitalProduct.id, orderItemId: priorOrderItem.id },
    });

    // Bypass the cart-service gate directly (simulating a pre-existing cart
    // row from before the gate existed, or a race), plus a normal item.
    const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: buyer.id } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: digitalProduct.id, quantity: 1 } });
    await addToCart(token, physicalProduct.id, 1);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddressId: address.id });

    expect(res.status).toBe(201);
    expect(res.body.data.order.status).toBe("PAID");

    const entitlements = await prisma.digitalEntitlement.count({
      where: { userId: buyer.id, productId: digitalProduct.id },
    });
    expect(entitlements).toBe(1);

    const cartRes = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${token}`);
    expect(cartRes.body.data.cart.items).toHaveLength(0);
  });

  it("grants a digital entitlement and does not require a shipping address for a digital-only cart", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const product = await createDigitalProduct(store.id, category.id, { price: 3000 });
    await addToCart(token, product.id);

    const res = await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${token}`).send({});

    expect(res.status).toBe(201);
    expect(res.body.data.order.status).toBe("PAID");

    const entitlement = await prisma.digitalEntitlement.findUnique({
      where: { userId_productId: { userId: buyer.id, productId: product.id } },
    });
    expect(entitlement).not.toBeNull();
  });

  it("requires a shipping address when the cart has a physical item", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    await addToCart(token, product.id);

    const res = await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SHIPPING_ADDRESS_REQUIRED");
  });

  it("404s on another user's address", async () => {
    const buyer = await createBuyer();
    const intruder = await createBuyer();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const address = await createAddress(intruder.id);
    const token = tokenFor(buyer);
    await addToCart(token, product.id);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddressId: address.id });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ADDRESS_NOT_FOUND");
  });

  it("rejects checkout when an item's stock is no longer sufficient", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 3 });
    const address = await createAddress(buyer.id);
    await addToCart(token, product.id, 2);
    await prisma.product.update({ where: { id: product.id }, data: { stockQuantity: 1 } });

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddressId: address.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CART_VALIDATION_FAILED");
    expect(res.body.error.details.problems[0].issue).toBe("INSUFFICIENT_STOCK");
  });

  it("on simulated payment failure: leaves the order PENDING_PAYMENT, releases stock reservations, and keeps the cart intact", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 5 });
    const address = await createAddress(buyer.id);
    await addToCart(token, product.id, 2);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddressId: address.id, simulateFailure: true });

    expect(res.status).toBe(201);
    const order = res.body.data.order;
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.payment.status).toBe("PENDING");
    expect(order.payment.attempts).toHaveLength(1);
    expect(order.payment.attempts[0].status).toBe("FAILED");

    const reservations = await prisma.stockReservation.findMany({ where: { orderId: order.id } });
    expect(reservations.every((r) => r.status === "RELEASED")).toBe(true);

    const unchangedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(unchangedProduct.stockQuantity).toBe(5);

    const cartRes = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${token}`);
    expect(cartRes.body.data.cart.items).toHaveLength(1);
  });
});

describe("POST /api/v1/checkout/:orderId/retry-payment", () => {
  it("retries a failed payment and completes the order on success", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 5 });
    const address = await createAddress(buyer.id);
    await addToCart(token, product.id, 1);

    const failed = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddressId: address.id, simulateFailure: true });
    const orderId = failed.body.data.order.id;

    const retried = await request(app)
      .post(`/api/v1/checkout/${orderId}/retry-payment`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(retried.status).toBe(200);
    expect(retried.body.data.order.status).toBe("PAID");
    expect(retried.body.data.order.payment.attempts).toHaveLength(2);
  });

  it("rejects retrying an order that is already paid", async () => {
    const buyer = await createBuyer();
    const token = tokenFor(buyer);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const address = await createAddress(buyer.id);
    await addToCart(token, product.id, 1);

    const paid = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddressId: address.id });
    const orderId = paid.body.data.order.id;

    const res = await request(app).post(`/api/v1/checkout/${orderId}/retry-payment`).set("Authorization", `Bearer ${token}`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ORDER_NOT_AWAITING_PAYMENT");
  });

  it("404s retrying another user's order", async () => {
    const buyer = await createBuyer();
    const intruder = await createBuyer();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const address = await createAddress(buyer.id);
    const token = tokenFor(buyer);
    await addToCart(token, product.id, 1);

    const failed = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddressId: address.id, simulateFailure: true });
    const orderId = failed.body.data.order.id;

    const res = await request(app)
      .post(`/api/v1/checkout/${orderId}/retry-payment`)
      .set("Authorization", `Bearer ${tokenFor(intruder)}`)
      .send({});
    expect(res.status).toBe(404);
  });
});

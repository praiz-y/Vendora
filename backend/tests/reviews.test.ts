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
      username: uniqueUsername("rev"),
      email: uniqueEmail("rev"),
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
      slug: `rev-store-${n}`,
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
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `rev-category-${n}`, status: "ACTIVE" } });
}

async function createPhysicalProduct(storeId: string, categoryId: string) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Product ${n}`,
      slug: `rev-product-${n}`,
      description: "A great product for review testing.",
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

// Walks a single-seller order's one SellerOrder all the way to DELIVERED.
async function deliverOrder(sellerToken: string, orderId: string): Promise<{ orderItemId: string; sellerOrderId: string }> {
  const orderRes = await request(app).get(`/api/v1/seller-orders`).set("Authorization", `Bearer ${sellerToken}`);
  const sellerOrder = orderRes.body.data.sellerOrders.find((so: { orderId: string }) => so.orderId === orderId);

  for (const status of ["PROCESSING", "SHIPPED", "DELIVERED"]) {
    await request(app)
      .patch(`/api/v1/seller-orders/${sellerOrder.id}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status });
  }

  const detailRes = await request(app)
    .get(`/api/v1/seller-orders/${sellerOrder.id}`)
    .set("Authorization", `Bearer ${sellerToken}`);
  return { orderItemId: detailRes.body.data.sellerOrder.items[0].id, sellerOrderId: sellerOrder.id };
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/v1/reviews", () => {
  it("rejects reviewing an order item before it's been delivered", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const order = await placeOrder(tokenFor(buyer), product.id, address.id);

    const sellerOrderRes = await request(app).get("/api/v1/seller-orders").set("Authorization", `Bearer ${tokenFor(seller)}`);
    const orderItemId = sellerOrderRes.body.data.sellerOrders[0].items[0].id;

    const res = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${tokenFor(buyer)}`)
      .send({ orderItemId, rating: 5, comment: "Great!" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ORDER_ITEM_NOT_DELIVERED");
    void order;
  });

  it("404s on an order item belonging to a different buyer", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();
    const otherBuyer = await createUser();
    const address = await createAddress(buyer.id);
    const order = await placeOrder(tokenFor(buyer), product.id, address.id);
    const { orderItemId } = await deliverOrder(tokenFor(seller), order.id);

    const res = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${tokenFor(otherBuyer)}`)
      .send({ orderItemId, rating: 4 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ORDER_ITEM_NOT_FOUND");
  });

  it("allows a review once the order item is delivered, and rejects a second review for the same item", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const order = await placeOrder(tokenFor(buyer), product.id, address.id);
    const { orderItemId } = await deliverOrder(tokenFor(seller), order.id);

    const buyerToken = tokenFor(buyer);
    const res = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ orderItemId, rating: 5, comment: "Loved it." });
    expect(res.status).toBe(201);
    expect(res.body.data.review.rating).toBe(5);
    expect(res.body.data.review.productId).toBe(product.id);

    const dupe = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ orderItemId, rating: 1 });
    expect(dupe.status).toBe(409);
    expect(dupe.body.error.code).toBe("ALREADY_REVIEWED");
  });

  it("rejects an out-of-range rating", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const order = await placeOrder(tokenFor(buyer), product.id, address.id);
    const { orderItemId } = await deliverOrder(tokenFor(seller), order.id);

    const res = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${tokenFor(buyer)}`)
      .send({ orderItemId, rating: 6 });
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/reviews", () => {
  it("is public, and returns the product's rating summary alongside its reviews", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const buyerA = await createUser();
    const buyerB = await createUser();

    const addressA = await createAddress(buyerA.id);
    const orderA = await placeOrder(tokenFor(buyerA), product.id, addressA.id);
    const { orderItemId: itemA } = await deliverOrder(tokenFor(seller), orderA.id);
    await request(app).post("/api/v1/reviews").set("Authorization", `Bearer ${tokenFor(buyerA)}`).send({ orderItemId: itemA, rating: 4 });

    const addressB = await createAddress(buyerB.id);
    const orderB = await placeOrder(tokenFor(buyerB), product.id, addressB.id);
    const { orderItemId: itemB } = await deliverOrder(tokenFor(seller), orderB.id);
    await request(app).post("/api/v1/reviews").set("Authorization", `Bearer ${tokenFor(buyerB)}`).send({ orderItemId: itemB, rating: 2 });

    const res = await request(app).get(`/api/v1/reviews?productId=${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reviews).toHaveLength(2);
    expect(res.body.data.summary.reviewCount).toBe(2);
    expect(res.body.data.summary.averageRating).toBe(3);
  });
});

describe("GET /api/v1/reviews/me/store", () => {
  it("requires an active seller capability", async () => {
    const buyer = await createUser();
    const res = await request(app).get("/api/v1/reviews/me/store").set("Authorization", `Bearer ${tokenFor(buyer)}`);
    expect(res.status).toBe(403);
  });

  it("lists reviews across every product in the caller's own store only", async () => {
    const { seller: sellerA, store: storeA } = await createActiveSeller();
    const { seller: sellerB, store: storeB } = await createActiveSeller();
    const category = await createCategory();
    const productA = await createPhysicalProduct(storeA.id, category.id);
    const productB = await createPhysicalProduct(storeB.id, category.id);
    const buyer = await createUser();

    const addressA = await createAddress(buyer.id);
    const orderA = await placeOrder(tokenFor(buyer), productA.id, addressA.id);
    const { orderItemId: itemA } = await deliverOrder(tokenFor(sellerA), orderA.id);
    await request(app).post("/api/v1/reviews").set("Authorization", `Bearer ${tokenFor(buyer)}`).send({ orderItemId: itemA, rating: 5 });

    const addressB = await createAddress(buyer.id);
    const orderB = await placeOrder(tokenFor(buyer), productB.id, addressB.id);
    const { orderItemId: itemB } = await deliverOrder(tokenFor(sellerB), orderB.id);
    await request(app).post("/api/v1/reviews").set("Authorization", `Bearer ${tokenFor(buyer)}`).send({ orderItemId: itemB, rating: 3 });

    const res = await request(app).get("/api/v1/reviews/me/store").set("Authorization", `Bearer ${tokenFor(sellerA)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reviews).toHaveLength(1);
    expect(res.body.data.reviews[0].product.id).toBe(productA.id);
  });
});

describe("Rating aggregates on marketplace endpoints", () => {
  it("reflects the store rating as the average of its products' individual average ratings", async () => {
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const productA = await createPhysicalProduct(store.id, category.id);
    const productB = await createPhysicalProduct(store.id, category.id);
    const buyer = await createUser();

    const addressA = await createAddress(buyer.id);
    const orderA = await placeOrder(tokenFor(buyer), productA.id, addressA.id);
    const { orderItemId: itemA } = await deliverOrder(tokenFor(seller), orderA.id);
    await request(app).post("/api/v1/reviews").set("Authorization", `Bearer ${tokenFor(buyer)}`).send({ orderItemId: itemA, rating: 5 });

    const addressB = await createAddress(buyer.id);
    const orderB = await placeOrder(tokenFor(buyer), productB.id, addressB.id);
    const { orderItemId: itemB } = await deliverOrder(tokenFor(seller), orderB.id);
    await request(app).post("/api/v1/reviews").set("Authorization", `Bearer ${tokenFor(buyer)}`).send({ orderItemId: itemB, rating: 1 });

    const productRes = await request(app).get(`/api/v1/marketplace/products/${productA.slug}`);
    expect(productRes.body.data.product.rating).toEqual({ averageRating: 5, reviewCount: 1 });

    // Average of each product's own average (5 and 1) -> 3, not a raw
    // average across all reviews (which would also happen to be 3 here,
    // but with unequal review counts per product it would diverge).
    const storeRes = await request(app).get(`/api/v1/marketplace/stores/${store.slug}`);
    expect(storeRes.body.data.store.rating.averageRating).toBe(3);
    expect(storeRes.body.data.store.rating.reviewedProductCount).toBe(2);
  });
});

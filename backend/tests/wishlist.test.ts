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

// move-to-cart exercises cart.service.addToCart, which requires a Cart row
// that only auth.service.ts's register() creates normally — replicate it
// here since these tests bypass that endpoint (direct Prisma inserts).
async function createUser() {
  const user = await prisma.user.create({
    data: {
      firstName: "Buyer",
      lastName: `${next()}`,
      username: uniqueUsername("wish"),
      email: uniqueEmail("wish"),
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
      username: uniqueUsername("wishseller"),
      email: uniqueEmail("wishseller"),
      passwordHash: "not-used-in-these-tests",
    },
  });
  return prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `Store ${n}`,
      slug: `wish-store-${n}`,
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
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `wish-category-${n}`, status: "ACTIVE" } });
}

async function createProduct(
  storeId: string,
  categoryId: string,
  overrides: Partial<{ status: "APPROVED" | "DRAFT"; stockQuantity: number }> = {}
) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Product ${n}`,
      slug: `wish-product-${n}`,
      description: "A great product for wishlist testing.",
      type: "PHYSICAL",
      price: 1000,
      stockQuantity: overrides.stockQuantity ?? 5,
      shippingType: "FREE",
      status: overrides.status ?? "APPROVED",
    },
  });
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

describe("GET /api/v1/wishlist", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/wishlist");
    expect(res.status).toBe(401);
  });

  it("returns an empty wishlist for a fresh user", async () => {
    const user = await createUser();
    const res = await request(app).get("/api/v1/wishlist").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.wishlist).toEqual([]);
  });
});

describe("POST /api/v1/wishlist/items", () => {
  it("adds a product to the wishlist", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createProduct(store.id, category.id);

    const res = await request(app)
      .post("/api/v1/wishlist/items")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ productId: product.id });

    expect(res.status).toBe(201);
    expect(res.body.data.wishlist).toHaveLength(1);
    expect(res.body.data.wishlist[0].product.id).toBe(product.id);
    expect(res.body.data.wishlist[0].isAvailable).toBe(true);
  });

  // Overhaul Phase 6: the wishlist page renders items through the shared
  // ProductCard, which needs a rating summary and category — the same
  // shape marketplace.service.ts's publicProductSelect exposes elsewhere.
  it("includes a rating summary and category on the product, matching the shared ProductCard's needs", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createProduct(store.id, category.id);

    const res = await request(app)
      .post("/api/v1/wishlist/items")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ productId: product.id });

    expect(res.status).toBe(201);
    expect(res.body.data.wishlist[0].product.rating).toEqual({ averageRating: null, reviewCount: 0 });
    expect(res.body.data.wishlist[0].product.category.id).toBe(category.id);
  });

  it("rejects adding the same product twice", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createProduct(store.id, category.id);
    const token = tokenFor(user);
    await request(app).post("/api/v1/wishlist/items").set("Authorization", `Bearer ${token}`).send({ productId: product.id });

    const res = await request(app).post("/api/v1/wishlist/items").set("Authorization", `Bearer ${token}`).send({ productId: product.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_IN_WISHLIST");
  });

  it("404s for a nonexistent product", async () => {
    const user = await createUser();
    const res = await request(app)
      .post("/api/v1/wishlist/items")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ productId: "does-not-exist" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("flags a wishlisted product as unavailable once archived, without removing it", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createProduct(store.id, category.id);
    const token = tokenFor(user);
    await request(app).post("/api/v1/wishlist/items").set("Authorization", `Bearer ${token}`).send({ productId: product.id });

    await prisma.product.update({ where: { id: product.id }, data: { status: "ARCHIVED" } });
    const res = await request(app).get("/api/v1/wishlist").set("Authorization", `Bearer ${token}`);
    expect(res.body.data.wishlist).toHaveLength(1);
    expect(res.body.data.wishlist[0].isAvailable).toBe(false);
    expect(res.body.data.wishlist[0].issue).toBe("PRODUCT_UNAVAILABLE");
  });
});

describe("DELETE /api/v1/wishlist/items/:id", () => {
  it("404s removing another user's wishlist item", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createProduct(store.id, category.id);
    const added = await request(app)
      .post("/api/v1/wishlist/items")
      .set("Authorization", `Bearer ${tokenFor(owner)}`)
      .send({ productId: product.id });
    const itemId = added.body.data.wishlist[0].id;

    const res = await request(app).delete(`/api/v1/wishlist/items/${itemId}`).set("Authorization", `Bearer ${tokenFor(intruder)}`);
    expect(res.status).toBe(404);
  });

  it("removes a wishlist item", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createProduct(store.id, category.id);
    const token = tokenFor(user);
    const added = await request(app).post("/api/v1/wishlist/items").set("Authorization", `Bearer ${token}`).send({ productId: product.id });
    const itemId = added.body.data.wishlist[0].id;

    const res = await request(app).delete(`/api/v1/wishlist/items/${itemId}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.wishlist).toHaveLength(0);
  });
});

describe("POST /api/v1/wishlist/items/:id/move-to-cart", () => {
  it("moves the item into the cart and removes it from the wishlist", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createProduct(store.id, category.id);
    const token = tokenFor(user);
    const added = await request(app).post("/api/v1/wishlist/items").set("Authorization", `Bearer ${token}`).send({ productId: product.id });
    const itemId = added.body.data.wishlist[0].id;

    const res = await request(app).post(`/api/v1/wishlist/items/${itemId}/move-to-cart`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items).toHaveLength(1);
    expect(res.body.data.cart.items[0].product.id).toBe(product.id);

    const wishlistAfter = await request(app).get("/api/v1/wishlist").set("Authorization", `Bearer ${token}`);
    expect(wishlistAfter.body.data.wishlist).toHaveLength(0);
  });

  it("leaves the wishlist item in place if the move to cart fails", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createProduct(store.id, category.id, { stockQuantity: 0 });
    const token = tokenFor(user);
    const added = await request(app).post("/api/v1/wishlist/items").set("Authorization", `Bearer ${token}`).send({ productId: product.id });
    const itemId = added.body.data.wishlist[0].id;

    const res = await request(app).post(`/api/v1/wishlist/items/${itemId}/move-to-cart`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");

    const wishlistAfter = await request(app).get("/api/v1/wishlist").set("Authorization", `Bearer ${token}`);
    expect(wishlistAfter.body.data.wishlist).toHaveLength(1);
  });

  it("404s moving another user's wishlist item", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createProduct(store.id, category.id);
    const added = await request(app)
      .post("/api/v1/wishlist/items")
      .set("Authorization", `Bearer ${tokenFor(owner)}`)
      .send({ productId: product.id });
    const itemId = added.body.data.wishlist[0].id;

    const res = await request(app)
      .post(`/api/v1/wishlist/items/${itemId}/move-to-cart`)
      .set("Authorization", `Bearer ${tokenFor(intruder)}`);
    expect(res.status).toBe(404);
  });
});

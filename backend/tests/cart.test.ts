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

// Cart isn't auto-created by a DB trigger — auth.service.ts's register()
// creates one explicitly alongside the User. These tests bypass that
// endpoint (direct Prisma inserts, for speed), so they have to replicate it.
async function createUser() {
  const user = await prisma.user.create({
    data: {
      firstName: "Buyer",
      lastName: `${next()}`,
      username: uniqueUsername("cart"),
      email: uniqueEmail("cart"),
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
      username: uniqueUsername("cartseller"),
      email: uniqueEmail("cartseller"),
      passwordHash: "not-used-in-these-tests",
    },
  });
  return prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `Store ${n}`,
      slug: `cart-store-${n}`,
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
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `cart-category-${n}`, status: "ACTIVE" } });
}

async function createPhysicalProduct(
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
      slug: `cart-product-${n}`,
      description: "A great product for cart testing.",
      type: "PHYSICAL",
      price: 1000,
      stockQuantity: overrides.stockQuantity ?? 5,
      shippingType: "FREE",
      status: overrides.status ?? "APPROVED",
    },
  });
}

async function createDigitalProduct(storeId: string, categoryId: string) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Digital ${n}`,
      slug: `cart-digital-${n}`,
      description: "A digital product for cart testing.",
      type: "DIGITAL",
      price: 2000,
      status: "APPROVED",
      digitalVersions: { create: { version: 1, fileKey: "key", fileType: "application/pdf", fileSize: 100 } },
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

describe("GET /api/v1/cart", () => {
  // Overhaul Phase 3: cart is guest-accessible now — login is only required
  // at checkout, not at add-to-cart. An anonymous request gets a
  // freshly-created, empty guest cart instead of a 401.
  it("returns an empty guest cart when unauthenticated, and sets a guest cart cookie", async () => {
    const res = await request(app).get("/api/v1/cart");
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items).toEqual([]);
    const setCookie = (res.headers["set-cookie"] ?? []) as unknown as string[];
    expect(setCookie.some((c) => c.startsWith("vendora_guest_cart="))).toBe(true);
    expect(setCookie.some((c) => c.includes("HttpOnly"))).toBe(true);
  });

  it("returns an empty cart for a fresh user", async () => {
    const user = await createUser();
    const res = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items).toEqual([]);
  });
});

describe("guest cart (anonymous)", () => {
  it("persists items across requests via the guest cart cookie", async () => {
    const agent = request.agent(app);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 5 });

    const added = await agent.post("/api/v1/cart/items").send({ productId: product.id, quantity: 2 });
    expect(added.status).toBe(201);
    expect(added.body.data.cart.items).toHaveLength(1);

    const fetched = await agent.get("/api/v1/cart");
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.cart.items).toHaveLength(1);
    expect(fetched.body.data.cart.items[0].quantity).toBe(2);
  });

  it("gives two different guests separate, isolated carts", async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 5 });

    await agentA.post("/api/v1/cart/items").send({ productId: product.id, quantity: 1 });
    const cartB = await agentB.get("/api/v1/cart");
    expect(cartB.body.data.cart.items).toEqual([]);
  });

  it("an authenticated request uses the user's own cart, never a guest cookie's cart", async () => {
    const agent = request.agent(app);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 5 });
    await agent.post("/api/v1/cart/items").send({ productId: product.id, quantity: 1 });

    const user = await createUser();
    const authed = await agent.get("/api/v1/cart").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(authed.body.data.cart.items).toEqual([]);
  });

  it("404s updating or removing an item from a different guest's cart", async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 5 });

    const added = await agentA.post("/api/v1/cart/items").send({ productId: product.id, quantity: 1 });
    const itemId = added.body.data.cart.items[0].id;

    const patchRes = await agentB.patch(`/api/v1/cart/items/${itemId}`).send({ quantity: 2 });
    expect(patchRes.status).toBe(404);

    const deleteRes = await agentB.delete(`/api/v1/cart/items/${itemId}`);
    expect(deleteRes.status).toBe(404);
  });
});

describe("POST /api/v1/cart/items", () => {
  it("adds a physical product, and increments quantity on re-add", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 10 });
    const token = tokenFor(user);

    const first = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id, quantity: 2 });
    expect(first.status).toBe(201);
    expect(first.body.data.cart.items).toHaveLength(1);
    expect(first.body.data.cart.items[0].quantity).toBe(2);
    expect(first.body.data.cart.items[0].isAvailable).toBe(true);

    const second = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id, quantity: 3 });
    expect(second.body.data.cart.items[0].quantity).toBe(5);
  });

  it("rejects adding more than available stock", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 2 });

    const res = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ productId: product.id, quantity: 3 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
  });

  it("adds a digital product with quantity forced to 1, and rejects re-adding it", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createDigitalProduct(store.id, category.id);
    const token = tokenFor(user);

    const first = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id, quantity: 5 });
    expect(first.status).toBe(201);
    expect(first.body.data.cart.items[0].quantity).toBe(1);

    const second = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id, quantity: 1 });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("ALREADY_IN_CART");
  });

  it("rejects adding a non-approved or suspended-store product", async () => {
    const user = await createUser();
    const store = await createStore();
    const suspendedStore = await createStore({ status: "SUSPENDED" });
    const category = await createCategory();
    const draft = await createPhysicalProduct(store.id, category.id, { status: "DRAFT" });
    const fromSuspended = await createPhysicalProduct(suspendedStore.id, category.id);
    const token = tokenFor(user);

    const res1 = await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${token}`).send({ productId: draft.id });
    expect(res1.status).toBe(400);
    expect(res1.body.error.code).toBe("PRODUCT_UNAVAILABLE");

    const res2 = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: fromSuspended.id });
    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe("PRODUCT_UNAVAILABLE");
  });
});

describe("PATCH /api/v1/cart/items/:id and DELETE", () => {
  it("updates quantity, rejecting quantities beyond stock", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 4 });
    const token = tokenFor(user);
    const added = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id, quantity: 1 });
    const itemId = added.body.data.cart.items[0].id;

    const updated = await request(app)
      .patch(`/api/v1/cart/items/${itemId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 4 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.cart.items[0].quantity).toBe(4);

    const tooMany = await request(app)
      .patch(`/api/v1/cart/items/${itemId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 5 });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error.code).toBe("INSUFFICIENT_STOCK");
  });

  it("404s updating or deleting another user's cart item", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const added = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${tokenFor(owner)}`)
      .send({ productId: product.id });
    const itemId = added.body.data.cart.items[0].id;
    const intruderToken = tokenFor(intruder);

    const patchRes = await request(app)
      .patch(`/api/v1/cart/items/${itemId}`)
      .set("Authorization", `Bearer ${intruderToken}`)
      .send({ quantity: 2 });
    expect(patchRes.status).toBe(404);

    const deleteRes = await request(app).delete(`/api/v1/cart/items/${itemId}`).set("Authorization", `Bearer ${intruderToken}`);
    expect(deleteRes.status).toBe(404);
  });

  it("removes an item from the cart", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id);
    const token = tokenFor(user);
    const added = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id });
    const itemId = added.body.data.cart.items[0].id;

    const removed = await request(app).delete(`/api/v1/cart/items/${itemId}`).set("Authorization", `Bearer ${token}`);
    expect(removed.status).toBe(200);
    expect(removed.body.data.cart.items).toHaveLength(0);
  });
});

describe("cart item availability reflects live product/store state", () => {
  it("flags an item as unavailable once its product is archived or its store is suspended", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 3 });
    const token = tokenFor(user);
    await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${token}`).send({ productId: product.id });

    await prisma.product.update({ where: { id: product.id }, data: { status: "ARCHIVED" } });
    const afterArchive = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${token}`);
    expect(afterArchive.body.data.cart.items[0].isAvailable).toBe(false);
    expect(afterArchive.body.data.cart.items[0].issue).toBe("PRODUCT_UNAVAILABLE");

    await prisma.product.update({ where: { id: product.id }, data: { status: "APPROVED" } });
    await prisma.store.update({ where: { id: store.id }, data: { status: "SUSPENDED" } });
    const afterSuspend = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${token}`);
    expect(afterSuspend.body.data.cart.items[0].isAvailable).toBe(false);
    expect(afterSuspend.body.data.cart.items[0].issue).toBe("STORE_UNAVAILABLE");
  });

  it("flags an item as unavailable once stock drops below the cart quantity", async () => {
    const user = await createUser();
    const store = await createStore();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, { stockQuantity: 5 });
    const token = tokenFor(user);
    await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id, quantity: 5 });

    await prisma.product.update({ where: { id: product.id }, data: { stockQuantity: 1 } });
    const res = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${token}`);
    expect(res.body.data.cart.items[0].isAvailable).toBe(false);
    expect(res.body.data.cart.items[0].issue).toBe("INSUFFICIENT_STOCK");
  });
});

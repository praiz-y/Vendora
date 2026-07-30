import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDatabase, uniqueEmail, uniqueUsername } from "./helpers";

const app = createApp();

let seq = 0;
function next() {
  seq += 1;
  return seq;
}

async function createStore(overrides: { status?: "ACTIVE" | "SUSPENDED" | "CLOSED" } = {}) {
  const n = next();
  const seller = await prisma.user.create({
    data: {
      firstName: "Seller",
      lastName: `${n}`,
      username: uniqueUsername("mkt"),
      email: uniqueEmail("mkt"),
      passwordHash: "not-used-in-these-tests",
    },
  });
  return prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `Store ${n}`,
      slug: `store-${n}`,
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
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `category-${n}`, status: "ACTIVE" } });
}

async function createProduct(
  storeId: string,
  categoryId: string,
  overrides: Partial<{ status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED"; name: string; price: number }> = {}
) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: overrides.name ?? `Product ${n}`,
      slug: `product-${n}`,
      description: "A great product description for testing purposes.",
      type: "PHYSICAL",
      price: overrides.price ?? 1000,
      stockQuantity: 5,
      shippingType: "FREE",
      status: overrides.status ?? "APPROVED",
    },
  });
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/marketplace/products", () => {
  it("only returns APPROVED products from ACTIVE stores, with no authentication", async () => {
    const activeStore = await createStore();
    const suspendedStore = await createStore({ status: "SUSPENDED" });
    const category = await createCategory();

    const visible = await createProduct(activeStore.id, category.id, { status: "APPROVED" });
    await createProduct(activeStore.id, category.id, { status: "DRAFT" });
    await createProduct(activeStore.id, category.id, { status: "PENDING_REVIEW" });
    await createProduct(activeStore.id, category.id, { status: "REJECTED" });
    await createProduct(activeStore.id, category.id, { status: "ARCHIVED" });
    await createProduct(suspendedStore.id, category.id, { status: "APPROVED" });

    const res = await request(app).get("/api/v1/marketplace/products");

    expect(res.status).toBe(200);
    const ids = res.body.data.products.map((p: { id: string }) => p.id);
    expect(ids).toEqual([visible.id]);
  });

  it("never exposes internal moderation fields or digital file references", async () => {
    const store = await createStore();
    const category = await createCategory();
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Digital Good",
        slug: "digital-good",
        description: "A downloadable digital good.",
        type: "DIGITAL",
        price: 500,
        status: "APPROVED",
        digitalVersions: { create: { version: 1, fileKey: "secret/path.pdf", fileType: "application/pdf", fileSize: 1024 } },
      },
    });

    const res = await request(app).get(`/api/v1/marketplace/products/${product.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.data.product.digitalVersions).toBeUndefined();
    expect(res.body.data.product.status).toBeUndefined();
    expect(res.body.data.product.rejectionReason).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("secret/path.pdf");
  });

  it("filters by search text across name and description", async () => {
    const store = await createStore();
    const category = await createCategory();
    const match = await createProduct(store.id, category.id, { name: "Ankara Print Shirt" });
    await createProduct(store.id, category.id, { name: "Leather Wallet" });

    const res = await request(app).get("/api/v1/marketplace/products?search=ankara");
    expect(res.body.data.products.map((p: { id: string }) => p.id)).toEqual([match.id]);
  });

  it("filters by category slug and store slug", async () => {
    const storeA = await createStore();
    const storeB = await createStore();
    const categoryA = await createCategory();
    const categoryB = await createCategory();
    const target = await createProduct(storeA.id, categoryA.id);
    await createProduct(storeA.id, categoryB.id);
    await createProduct(storeB.id, categoryA.id);

    const byCategory = await request(app).get(`/api/v1/marketplace/products?categorySlug=${categoryA.slug}`);
    expect(byCategory.body.data.products.map((p: { id: string }) => p.id).sort()).toEqual(
      [target.id, (await prisma.product.findFirst({ where: { storeId: storeB.id, categoryId: categoryA.id } }))!.id].sort()
    );

    const byStore = await request(app).get(`/api/v1/marketplace/products?storeSlug=${storeA.slug}`);
    expect(byStore.body.data.products).toHaveLength(2);
  });

  it("filters by price range and sorts by price", async () => {
    const store = await createStore();
    const category = await createCategory();
    const cheap = await createProduct(store.id, category.id, { price: 500 });
    const mid = await createProduct(store.id, category.id, { price: 1500 });
    await createProduct(store.id, category.id, { price: 5000 });

    const ranged = await request(app).get("/api/v1/marketplace/products?minPrice=400&maxPrice=2000");
    expect(ranged.body.data.products.map((p: { id: string }) => p.id).sort()).toEqual([cheap.id, mid.id].sort());

    const sorted = await request(app).get("/api/v1/marketplace/products?sort=price_asc");
    const prices = sorted.body.data.products.map((p: { price: string }) => Number(p.price));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("paginates results", async () => {
    const store = await createStore();
    const category = await createCategory();
    for (let i = 0; i < 3; i += 1) await createProduct(store.id, category.id);

    const res = await request(app).get("/api/v1/marketplace/products?limit=2&page=1");
    expect(res.body.data.products).toHaveLength(2);
    expect(res.body.data.meta.total).toBe(3);
    expect(res.body.data.meta.totalPages).toBe(2);
  });
});

describe("GET /api/v1/marketplace/products/:slug", () => {
  it("404s for a non-APPROVED product", async () => {
    const store = await createStore();
    const category = await createCategory();
    const draft = await createProduct(store.id, category.id, { status: "DRAFT" });

    const res = await request(app).get(`/api/v1/marketplace/products/${draft.slug}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("404s for an APPROVED product whose store is suspended", async () => {
    const store = await createStore({ status: "SUSPENDED" });
    const category = await createCategory();
    const product = await createProduct(store.id, category.id, { status: "APPROVED" });

    const res = await request(app).get(`/api/v1/marketplace/products/${product.slug}`);
    expect(res.status).toBe(404);
  });

  it("shows an out-of-stock product rather than hiding it", async () => {
    const store = await createStore();
    const category = await createCategory();
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Sold Out Item",
        slug: "sold-out-item",
        description: "This item is currently out of stock.",
        type: "PHYSICAL",
        price: 1000,
        stockQuantity: 0,
        shippingType: "FREE",
        status: "APPROVED",
      },
    });

    const res = await request(app).get(`/api/v1/marketplace/products/${product.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.product.stockQuantity).toBe(0);
  });
});

describe("GET /api/v1/marketplace/stores/:slug", () => {
  it("returns an ACTIVE store without exposing phone/email", async () => {
    const store = await createStore();
    const res = await request(app).get(`/api/v1/marketplace/stores/${store.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.data.store.id).toBe(store.id);
    expect(res.body.data.store.phone).toBeUndefined();
    expect(res.body.data.store.email).toBeUndefined();
  });

  it("404s for a suspended or closed store", async () => {
    const suspended = await createStore({ status: "SUSPENDED" });
    const closed = await createStore({ status: "CLOSED" });

    const res1 = await request(app).get(`/api/v1/marketplace/stores/${suspended.slug}`);
    const res2 = await request(app).get(`/api/v1/marketplace/stores/${closed.slug}`);
    expect(res1.status).toBe(404);
    expect(res2.status).toBe(404);
  });
});

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
      username: uniqueUsername("entbuyer"),
      email: uniqueEmail("entbuyer"),
      passwordHash: "not-used-in-these-tests",
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
}

async function createActiveSeller() {
  const seller = await prisma.user.create({
    data: {
      firstName: "Seller",
      lastName: `${next()}`,
      username: uniqueUsername("entseller"),
      email: uniqueEmail("entseller"),
      passwordHash: "not-used-in-these-tests",
    },
  });
  await prisma.cart.create({ data: { userId: seller.id } });
  const n = next();
  const store = await prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `Store ${n}`,
      slug: `ent-store-${n}`,
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
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `ent-category-${n}`, status: "ACTIVE" } });
}

async function createDigitalProduct(storeId: string, categoryId: string) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Digital ${n}`,
      slug: `ent-digital-${n}`,
      description: "A great digital product for entitlement testing.",
      type: "DIGITAL",
      price: 2500,
      status: "APPROVED",
      digitalVersions: { create: { version: 1, fileKey: "v1.pdf", fileType: "application/pdf", fileSize: 1024 } },
    },
  });
}

function tokenFor(user: { id: string; role: "USER" | "ADMIN" }) {
  return signAccessToken({ sub: user.id, role: user.role });
}

async function purchase(token: string, productId: string) {
  await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${token}`).send({ productId, quantity: 1 });
  await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${token}`).send({});
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/entitlements", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/entitlements");
    expect(res.status).toBe(401);
  });

  it("lists the buyer's purchased digital products with the latest version info", async () => {
    const buyer = await createBuyer();
    const { store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createDigitalProduct(store.id, category.id);
    const token = tokenFor(buyer);
    await purchase(token, product.id);

    const res = await request(app).get("/api/v1/entitlements").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.entitlements).toHaveLength(1);
    expect(res.body.data.entitlements[0].product.id).toBe(product.id);
    expect(res.body.data.entitlements[0].latestVersion.version).toBe(1);
  });
});

describe("GET /api/v1/entitlements/:productId/download", () => {
  it("403s for a product the buyer never purchased", async () => {
    const buyer = await createBuyer();
    const { store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createDigitalProduct(store.id, category.id);

    const res = await request(app)
      .get(`/api/v1/entitlements/${product.id}/download`)
      .set("Authorization", `Bearer ${tokenFor(buyer)}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("NOT_ENTITLED");
  });

  it("authorizes download for the entitled buyer, resolving the latest version", async () => {
    const buyer = await createBuyer();
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createDigitalProduct(store.id, category.id);
    const buyerToken = tokenFor(buyer);
    await purchase(buyerToken, product.id);

    // Seller ships a v2 after the purchase.
    await request(app)
      .post(`/api/v1/products/me/${product.id}/digital-versions`)
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send({ fileKey: "v2.pdf", fileType: "application/pdf", fileSize: 2048 });

    const res = await request(app)
      .get(`/api/v1/entitlements/${product.id}/download`)
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    // Entitlement resolves dynamically to the latest version, not the one
    // that existed at purchase time (Overview §21).
    expect(res.body.data.download.version).toBe(2);
    expect(res.body.data.download.fileKey).toBe("v2.pdf");
  });
});

describe("cart blocks re-buying an already-owned digital product", () => {
  it("rejects adding an owned digital product to the cart", async () => {
    const buyer = await createBuyer();
    const { store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createDigitalProduct(store.id, category.id);
    const token = tokenFor(buyer);
    await purchase(token, product.id);

    const res = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_OWNED");
  });
});

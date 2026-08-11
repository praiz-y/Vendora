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

async function createUser(overrides: { role?: "USER" | "ADMIN"; status?: "ACTIVE" | "SUSPENDED" } = {}) {
  const user = await prisma.user.create({
    data: {
      firstName: "User",
      lastName: `${next()}`,
      username: uniqueUsername("adash"),
      email: uniqueEmail("adash"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
      status: overrides.status ?? "ACTIVE",
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
      slug: `adash-store-${n}`,
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
  return prisma.category.create({ data: { name: `Category ${n}`, slug: `adash-category-${n}`, status: "ACTIVE" } });
}

async function createPhysicalProduct(storeId: string, categoryId: string, price = 1000) {
  const n = next();
  return prisma.product.create({
    data: {
      storeId,
      categoryId,
      name: `Product ${n}`,
      slug: `adash-product-${n}`,
      description: "A product for admin-dashboard testing.",
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

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/admin-dashboard/overview", () => {
  it("requires admin access", async () => {
    const user = await createUser();
    const res = await request(app).get("/api/v1/admin-dashboard/overview").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(403);
  });

  it("reports accurate platform-wide counts and only paid-order revenue", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const suspended = await createUser({ status: "SUSPENDED" });
    void suspended;
    const { seller, store } = await createActiveSeller();
    const category = await createCategory();
    const product = await createPhysicalProduct(store.id, category.id, 1000);
    const buyer = await createUser();
    const address = await createAddress(buyer.id);
    const buyerToken = tokenFor(buyer);

    await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${buyerToken}`).send({ productId: product.id, quantity: 2 });
    await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${buyerToken}`).send({ shippingAddressId: address.id });

    await prisma.sellerApplication.create({
      data: {
        userId: (await createUser()).id,
        storeName: `Pending App ${next()}`,
        storeDescription: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: uniqueEmail("adash-app"),
        location: "Lagos",
      },
    });

    const res = await request(app).get("/api/v1/admin-dashboard/overview").set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);
    const { overview } = res.body.data;

    expect(overview.users.suspended).toBe(1);
    expect(overview.stores.active).toBe(1);
    expect(overview.products.approved).toBe(1);
    expect(overview.orders.total).toBe(1);
    expect(Number(overview.totalRevenue)).toBe(2000);
    expect(overview.pendingActions.sellerApplications).toBe(1);
    void seller;
  });
});

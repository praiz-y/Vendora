import express from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { authenticate } from "../src/middlewares/authenticate";
import { requireActiveSeller, requireAdmin } from "../src/middlewares/authorize";
import { errorHandler, notFoundHandler } from "../src/middlewares/errorHandler";
import { signAccessToken } from "../src/services/token.service";
import { sendSuccess } from "../src/utils/apiResponse";
import { hasActiveSellerCapability, isAdmin, ownsResource } from "../src/utils/authz";
import { resetDatabase, uniqueEmail, uniqueUsername } from "./helpers";

const app = createApp();

// A tiny throwaway app that mounts real admin/seller-guarded routes, since
// Phase 2 intentionally has no real feature route to protect yet — this
// exercises the actual requireAdmin/requireActiveSeller middleware through
// real HTTP requests rather than mocking req/res by hand.
function buildGuardTestApp() {
  const testApp = express();
  testApp.use(express.json());
  testApp.get("/admin-only", authenticate, requireAdmin, (_req, res) => sendSuccess(res, null, "ok"));
  testApp.get("/seller-only", authenticate, requireActiveSeller, (_req, res) => sendSuccess(res, null, "ok"));
  testApp.use(notFoundHandler);
  testApp.use(errorHandler);
  return testApp;
}
const guardApp = buildGuardTestApp();

async function createUser(overrides: { role?: "USER" | "ADMIN"; status?: "ACTIVE" | "SUSPENDED" } = {}) {
  return prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "User",
      username: uniqueUsername("authz"),
      email: uniqueEmail("authz"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
      status: overrides.status ?? "ACTIVE",
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

describe("authz utils", () => {
  it("isAdmin distinguishes ADMIN from USER", async () => {
    expect(isAdmin({ id: "x", role: "ADMIN" })).toBe(true);
    expect(isAdmin({ id: "x", role: "USER" })).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it("ownsResource compares the resource owner id to the authenticated user id", () => {
    expect(ownsResource("user-1", { id: "user-1", role: "USER" })).toBe(true);
    expect(ownsResource("user-1", { id: "user-2", role: "USER" })).toBe(false);
  });

  it("hasActiveSellerCapability reflects LIVE store status, not a cached/token value", async () => {
    const user = await createUser();
    expect(await hasActiveSellerCapability(user.id)).toBe(false);

    const store = await prisma.store.create({
      data: {
        sellerId: user.id,
        name: "Test Store",
        slug: `test-store-${user.id}`,
        description: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: user.email,
        location: "Lagos",
        status: "ACTIVE",
      },
    });
    expect(await hasActiveSellerCapability(user.id)).toBe(true);

    await prisma.store.update({ where: { id: store.id }, data: { status: "SUSPENDED" } });
    expect(await hasActiveSellerCapability(user.id)).toBe(false);
  });
});

describe("authorization matrix (real HTTP requests through actual middleware)", () => {
  it("unauthenticated request is denied both admin-only and seller-only routes", async () => {
    const admin = await request(guardApp).get("/admin-only");
    const seller = await request(guardApp).get("/seller-only");
    expect(admin.status).toBe(401);
    expect(seller.status).toBe(401);
  });

  it("a plain buyer is denied admin-only and seller-only functionality", async () => {
    const buyer = await createUser();
    const token = tokenFor(buyer);

    const admin = await request(guardApp).get("/admin-only").set("Authorization", `Bearer ${token}`);
    const seller = await request(guardApp).get("/seller-only").set("Authorization", `Bearer ${token}`);
    expect(admin.status).toBe(403);
    expect(admin.body.error.code).toBe("ADMIN_REQUIRED");
    expect(seller.status).toBe(403);
    expect(seller.body.error.code).toBe("SELLER_CAPABILITY_REQUIRED");
  });

  it("an approved/active seller is granted seller-only but not admin-only functionality", async () => {
    const seller = await createUser();
    await prisma.store.create({
      data: {
        sellerId: seller.id,
        name: "Active Store",
        slug: `active-store-${seller.id}`,
        description: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: seller.email,
        location: "Lagos",
        status: "ACTIVE",
      },
    });
    const token = tokenFor(seller);

    const sellerRes = await request(guardApp).get("/seller-only").set("Authorization", `Bearer ${token}`);
    const adminRes = await request(guardApp).get("/admin-only").set("Authorization", `Bearer ${token}`);
    expect(sellerRes.status).toBe(200);
    expect(adminRes.status).toBe(403);
  });

  it("a suspended seller is denied seller-only functionality but keeps normal buyer/account access", async () => {
    const seller = await createUser();
    await prisma.store.create({
      data: {
        sellerId: seller.id,
        name: "Suspended Store",
        slug: `suspended-store-${seller.id}`,
        description: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: seller.email,
        location: "Lagos",
        status: "SUSPENDED",
      },
    });
    const token = tokenFor(seller);

    const sellerRes = await request(guardApp).get("/seller-only").set("Authorization", `Bearer ${token}`);
    expect(sellerRes.status).toBe(403);
    expect(sellerRes.body.error.code).toBe("SELLER_CAPABILITY_REQUIRED");

    // "Buyer functionality" is represented here by the real /auth/me route on
    // the actual app — a suspended SELLER (store) must still be a fully
    // functional buyer/account holder.
    const meRes = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.seller.status).toBe("SUSPENDED");
  });

  it("an admin is granted admin-only functionality but is not automatically a seller", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);

    const adminRes = await request(guardApp).get("/admin-only").set("Authorization", `Bearer ${token}`);
    const sellerRes = await request(guardApp).get("/seller-only").set("Authorization", `Bearer ${token}`);
    expect(adminRes.status).toBe(200);
    expect(sellerRes.status).toBe(403);
  });
});

describe("ownership: users cannot access another user's addresses", () => {
  it("returns 404 (not 403) when acting on another user's address by id", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const ownerToken = tokenFor(owner);
    const intruderToken = tokenFor(intruder);

    const createRes = await request(app)
      .post("/api/v1/users/me/addresses")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        fullName: "Owner Name",
        phone: "+2340000000001",
        addressLine1: "1 Owner St",
        city: "Lagos",
        state: "Lagos",
      });
    expect(createRes.status).toBe(201);
    const addressId = createRes.body.data.address.id;

    const readOthers = await request(app)
      .get("/api/v1/users/me/addresses")
      .set("Authorization", `Bearer ${intruderToken}`);
    expect(readOthers.body.data.addresses).toHaveLength(0);

    const updateAttempt = await request(app)
      .patch(`/api/v1/users/me/addresses/${addressId}`)
      .set("Authorization", `Bearer ${intruderToken}`)
      .send({ city: "Hijacked" });
    expect(updateAttempt.status).toBe(404);

    const deleteAttempt = await request(app)
      .delete(`/api/v1/users/me/addresses/${addressId}`)
      .set("Authorization", `Bearer ${intruderToken}`);
    expect(deleteAttempt.status).toBe(404);

    const stillThere = await prisma.address.findUnique({ where: { id: addressId } });
    expect(stillThere).not.toBeNull();
    expect(stillThere!.city).toBe("Lagos");
  });

  it("prevents a profile update from smuggling in a role/status change", async () => {
    const user = await createUser();
    const token = tokenFor(user);

    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "NewName", role: "ADMIN", status: "SUSPENDED" });

    expect(res.status).toBe(200);
    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.role).toBe("USER");
    expect(reloaded.status).toBe("ACTIVE");
    expect(reloaded.firstName).toBe("NewName");
  });
});

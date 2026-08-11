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

async function createUser(overrides: { role?: "USER" | "ADMIN"; firstName?: string } = {}) {
  const user = await prisma.user.create({
    data: {
      firstName: overrides.firstName ?? "User",
      lastName: `${next()}`,
      username: uniqueUsername("ausr"),
      email: uniqueEmail("ausr"),
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
      slug: `ausr-store-${n}`,
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

function tokenFor(user: { id: string; role: "USER" | "ADMIN" }) {
  return signAccessToken({ sub: user.id, role: user.role });
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/admin/users", () => {
  it("requires admin access", async () => {
    const user = await createUser();
    const res = await request(app).get("/api/v1/admin/users").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(403);
  });

  it("searches by name and never leaks passwordHash", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await createUser({ firstName: "Zainab" });
    await createUser({ firstName: "Chidi" });

    const res = await request(app)
      .get("/api/v1/admin/users?search=Zainab")
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(1);
    expect(res.body.data.users[0].firstName).toBe("Zainab");
    expect(res.body.data.users[0].passwordHash).toBeUndefined();
  });

  it("includes the caller's seller/store info when present", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { seller, store } = await createActiveSeller();

    const res = await request(app).get(`/api/v1/admin/users/${seller.id}`).set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.seller.storeId).toBe(store.id);
  });
});

describe("POST /api/v1/admin/users/:id/suspend and /reactivate", () => {
  it("suspends a user, blocks their login, and revokes their sessions", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const target = await createUser();

    const refreshToken = await prisma.refreshToken.create({
      data: {
        userId: target.id,
        tokenHash: "fake-hash-for-testing",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const res = await request(app)
      .post(`/api/v1/admin/users/${target.id}/suspend`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe("SUSPENDED");

    const updatedToken = await prisma.refreshToken.findUniqueOrThrow({ where: { id: refreshToken.id } });
    expect(updatedToken.revokedAt).not.toBeNull();

    const again = await request(app)
      .post(`/api/v1/admin/users/${target.id}/suspend`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("USER_ALREADY_SUSPENDED");

    const reactivateRes = await request(app)
      .post(`/api/v1/admin/users/${target.id}/reactivate`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.user.status).toBe("ACTIVE");
  });

  it("refuses to suspend an admin account", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const otherAdmin = await createUser({ role: "ADMIN" });

    const res = await request(app)
      .post(`/api/v1/admin/users/${otherAdmin.id}/suspend`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CANNOT_SUSPEND_ADMIN");
  });
});

describe("POST /api/v1/admin/users/:id/store/suspend and /reactivate", () => {
  it("suspends and reactivates a seller's store independently of their account", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { seller, store } = await createActiveSeller();
    const adminToken = tokenFor(admin);

    const suspendRes = await request(app)
      .post(`/api/v1/admin/users/${seller.id}/store/suspend`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.user.seller.status).toBe("SUSPENDED");
    // The account itself is untouched — the seller can still log in and buy.
    expect(suspendRes.body.data.user.status).toBe("ACTIVE");

    const storeRow = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(storeRow.status).toBe("SUSPENDED");

    const again = await request(app)
      .post(`/api/v1/admin/users/${seller.id}/store/suspend`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("STORE_ALREADY_SUSPENDED");

    const reactivateRes = await request(app)
      .post(`/api/v1/admin/users/${seller.id}/store/reactivate`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.user.seller.status).toBe("ACTIVE");
  });

  it("404s a store action on a user with no store", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();

    const res = await request(app)
      .post(`/api/v1/admin/users/${buyer.id}/store/suspend`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("STORE_NOT_FOUND");
  });
});

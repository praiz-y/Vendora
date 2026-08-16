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
      username: uniqueUsername("audit"),
      email: uniqueEmail("audit"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
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

describe("GET /api/v1/admin/audit-logs", () => {
  it("requires admin access", async () => {
    const user = await createUser();
    const res = await request(app).get("/api/v1/admin/audit-logs").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(403);
  });

  it("surfaces a real admin action (seller-application approval) with the acting admin attached", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const applicant = await createUser();
    const application = await prisma.sellerApplication.create({
      data: {
        userId: applicant.id,
        storeName: `Audit Store ${next()}`,
        storeDescription: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: applicant.email,
        location: "Lagos",
      },
    });

    const adminToken = tokenFor(admin);
    await request(app)
      .post(`/api/v1/admin/seller-applications/${application.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app).get("/api/v1/admin/audit-logs").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entry = res.body.data.logs.find((l: { action: string }) => l.action === "SELLER_APPLICATION_APPROVED");
    expect(entry).toBeTruthy();
    expect(entry.entityId).toBe(application.id);
    expect(entry.actor.id).toBe(admin.id);
  });

  it("filters by entityType and action", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const applicant = await createUser();
    const application = await prisma.sellerApplication.create({
      data: {
        userId: applicant.id,
        storeName: `Audit Store ${next()}`,
        storeDescription: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: applicant.email,
        location: "Lagos",
      },
    });
    const adminToken = tokenFor(admin);
    await request(app)
      .post(`/api/v1/admin/seller-applications/${application.id}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Incomplete business details." });

    const res = await request(app)
      .get("/api/v1/admin/audit-logs?entityType=SellerApplication&action=SELLER_APPLICATION_REJECTED")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBeGreaterThan(0);
    expect(res.body.data.logs.every((l: { action: string }) => l.action === "SELLER_APPLICATION_REJECTED")).toBe(true);
  });

  // Overhaul Phase 10: entityType is now a closed enum (the frontend's
  // free-text box became a dropdown of the real known values) — enforced
  // server-side too, not just cosmetically on the client.
  it("rejects an entityType outside the known set", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const res = await request(app)
      .get("/api/v1/admin/audit-logs?entityType=NotARealEntity")
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(422);
  });
});

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { signAccessToken } from "../src/services/token.service";
import { resetDatabase, uniqueEmail, uniqueUsername } from "./helpers";

const app = createApp();

async function createUser(overrides: { role?: "USER" | "ADMIN" } = {}) {
  return prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "User",
      username: uniqueUsername("cat"),
      email: uniqueEmail("cat"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
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

describe("admin category management", () => {
  it("blocks non-admins from admin category routes", async () => {
    const user = await createUser();
    const res = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ name: "Fashion" });
    expect(res.status).toBe(403);
  });

  it("creates a category with a generated slug", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const res = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ name: "Fashion & Textiles", description: "Clothing and fabrics" });

    expect(res.status).toBe(201);
    expect(res.body.data.category.slug).toBe("fashion-textiles");
    expect(res.body.data.category.status).toBe("ACTIVE");
  });

  it("allows duplicate category names, generating a distinct slug for the second one", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);
    const first = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Electronics" });

    const second = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Electronics" });

    expect(second.status).toBe(201);
    expect(second.body.data.category.slug).not.toBe(first.body.data.category.slug);
  });

  it("updates a category without changing its slug", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);
    const created = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Home & Garden" });
    const id = created.body.data.category.id;
    const originalSlug = created.body.data.category.slug;

    const updated = await request(app)
      .patch(`/api/v1/admin/categories/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Home, Garden & Outdoor" });

    expect(updated.status).toBe(200);
    expect(updated.body.data.category.name).toBe("Home, Garden & Outdoor");
    expect(updated.body.data.category.slug).toBe(originalSlug);
  });

  it("archives and reactivates a category, and filters by status", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);
    const created = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Seasonal" });
    const id = created.body.data.category.id;

    const archived = await request(app)
      .post(`/api/v1/admin/categories/${id}/archive`)
      .set("Authorization", `Bearer ${token}`);
    expect(archived.body.data.category.status).toBe("ARCHIVED");

    const archivedList = await request(app)
      .get("/api/v1/admin/categories?status=ARCHIVED")
      .set("Authorization", `Bearer ${token}`);
    expect(archivedList.body.data.categories.map((c: { id: string }) => c.id)).toContain(id);

    const activated = await request(app)
      .post(`/api/v1/admin/categories/${id}/activate`)
      .set("Authorization", `Bearer ${token}`);
    expect(activated.body.data.category.status).toBe("ACTIVE");
  });

  it("404s for an unknown category id", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const res = await request(app)
      .patch("/api/v1/admin/categories/does-not-exist")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ name: "Whatever" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CATEGORY_NOT_FOUND");
  });
});

describe("GET /api/v1/categories", () => {
  it("only returns ACTIVE categories, to any caller", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const adminToken = tokenFor(admin);
    const active = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Active Category" });
    const toArchive = await request(app)
      .post("/api/v1/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Archived Category" });
    await request(app)
      .post(`/api/v1/admin/categories/${toArchive.body.data.category.id}/archive`)
      .set("Authorization", `Bearer ${adminToken}`);

    const buyer = await createUser();
    const res = await request(app).get("/api/v1/categories").set("Authorization", `Bearer ${tokenFor(buyer)}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.categories.map((c: { id: string }) => c.id);
    expect(ids).toContain(active.body.data.category.id);
    expect(ids).not.toContain(toArchive.body.data.category.id);
  });

  it("is public — no authentication required (Phase 5)", async () => {
    const res = await request(app).get("/api/v1/categories");
    expect(res.status).toBe(200);
  });
});

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
      username: uniqueUsername("hero"),
      email: uniqueEmail("hero"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
    },
  });
}

function tokenFor(user: { id: string; role: "USER" | "ADMIN" }) {
  return signAccessToken({ sub: user.id, role: user.role });
}

function validSlideBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    imageUrl: "https://cdn.vendora.test/hero-1.jpg",
    headline: "Discover independent sellers",
    text: "Shop handmade and unique goods from across the marketplace.",
    ctaLabel: "Shop now",
    ctaUrl: "/products",
    enabled: true,
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/v1/hero-slides", () => {
  it("returns an empty list when no slides have ever been set", async () => {
    const res = await request(app).get("/api/v1/hero-slides");
    expect(res.status).toBe(200);
    expect(res.body.data.slides).toEqual([]);
  });

  it("returns only enabled slides, ordered by position, with no authentication required", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);
    await request(app)
      .put("/api/v1/admin/hero-slides/2")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody({ headline: "Second" }));
    await request(app)
      .put("/api/v1/admin/hero-slides/1")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody({ headline: "First" }));
    await request(app)
      .put("/api/v1/admin/hero-slides/3")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody({ headline: "Disabled", enabled: false }));

    const res = await request(app).get("/api/v1/hero-slides");
    expect(res.status).toBe(200);
    expect(res.body.data.slides).toHaveLength(2);
    expect(res.body.data.slides.map((s: { headline: string }) => s.headline)).toEqual(["First", "Second"]);
  });
});

describe("admin hero slide management", () => {
  it("blocks non-admins", async () => {
    const user = await createUser();
    const res = await request(app)
      .put("/api/v1/admin/hero-slides/1")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send(validSlideBody());
    expect(res.status).toBe(403);
  });

  it("blocks unauthenticated requests", async () => {
    const res = await request(app).put("/api/v1/admin/hero-slides/1").send(validSlideBody());
    expect(res.status).toBe(401);
  });

  it("404s for a position outside 1-4", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);

    const zero = await request(app)
      .put("/api/v1/admin/hero-slides/0")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody());
    const five = await request(app)
      .put("/api/v1/admin/hero-slides/5")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody());
    const nonNumeric = await request(app)
      .put("/api/v1/admin/hero-slides/abc")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody());

    expect(zero.status).toBe(404);
    expect(five.status).toBe(404);
    expect(nonNumeric.status).toBe(404);
  });

  it("rejects a non-http imageUrl and a missing headline", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);

    const badImage = await request(app)
      .put("/api/v1/admin/hero-slides/1")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody({ imageUrl: "javascript:alert(1)" }));
    expect(badImage.status).toBe(422);

    const missingHeadline = await request(app)
      .put("/api/v1/admin/hero-slides/1")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody({ headline: "" }));
    expect(missingHeadline.status).toBe(422);
  });

  it("accepts a freeform relative ctaUrl (not restricted to http(s))", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const res = await request(app)
      .put("/api/v1/admin/hero-slides/1")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send(validSlideBody({ ctaUrl: "/products?categorySlug=electronics" }));
    expect(res.status).toBe(200);
    expect(res.body.data.slide.ctaUrl).toBe("/products?categorySlug=electronics");
  });

  it("creates the slide at that position on first write, then updates the same row on later writes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);

    const first = await request(app)
      .put("/api/v1/admin/hero-slides/1")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody({ headline: "Original" }));
    expect(first.status).toBe(200);
    expect(first.body.data.slide.position).toBe(1);

    const second = await request(app)
      .put("/api/v1/admin/hero-slides/1")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody({ headline: "Updated" }));
    expect(second.status).toBe(200);
    expect(second.body.data.slide.headline).toBe("Updated");

    const count = await prisma.heroSlide.count({ where: { position: 1 } });
    expect(count).toBe(1);
  });

  it("records an audit log entry on update", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await request(app)
      .put("/api/v1/admin/hero-slides/1")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send(validSlideBody());

    const logs = await prisma.auditLog.findMany({ where: { entityType: "HeroSlide" } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("HERO_SLIDE_UPDATED");
    expect(logs[0].actorId).toBe(admin.id);
  });

  it("admin GET returns all 4 positions worth of state, including disabled slides", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);
    await request(app)
      .put("/api/v1/admin/hero-slides/1")
      .set("Authorization", `Bearer ${token}`)
      .send(validSlideBody({ enabled: false }));

    const res = await request(app).get("/api/v1/admin/hero-slides").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.slides).toHaveLength(1);
    expect(res.body.data.slides[0].enabled).toBe(false);
  });

  it("blocks non-admins from the admin GET", async () => {
    const user = await createUser();
    const res = await request(app).get("/api/v1/admin/hero-slides").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(403);
  });
});

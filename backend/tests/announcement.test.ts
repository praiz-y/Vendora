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
      username: uniqueUsername("announce"),
      email: uniqueEmail("announce"),
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

describe("GET /api/v1/announcement", () => {
  it("returns null when no announcement has ever been set", async () => {
    const res = await request(app).get("/api/v1/announcement");
    expect(res.status).toBe(200);
    expect(res.body.data.announcement).toBeNull();
  });

  it("returns null when the announcement is disabled", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await request(app)
      .put("/api/v1/admin/announcement")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ message: "Free shipping this week", enabled: false });

    const res = await request(app).get("/api/v1/announcement");
    expect(res.status).toBe(200);
    expect(res.body.data.announcement).toBeNull();
  });

  it("returns the message when enabled, with no authentication required", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await request(app)
      .put("/api/v1/admin/announcement")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ message: "Free shipping this week", enabled: true });

    const res = await request(app).get("/api/v1/announcement");
    expect(res.status).toBe(200);
    expect(res.body.data.announcement.message).toBe("Free shipping this week");
  });
});

describe("admin announcement management", () => {
  it("blocks non-admins", async () => {
    const user = await createUser();
    const res = await request(app)
      .put("/api/v1/admin/announcement")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ message: "Hello", enabled: true });
    expect(res.status).toBe(403);
  });

  it("blocks unauthenticated requests", async () => {
    const res = await request(app).put("/api/v1/admin/announcement").send({ message: "Hello", enabled: true });
    expect(res.status).toBe(401);
  });

  it("rejects a message over 150 characters", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const res = await request(app)
      .put("/api/v1/admin/announcement")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ message: "x".repeat(151), enabled: true });
    expect(res.status).toBe(422);
  });

  it("creates the singleton row on first write, then updates the same row on later writes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);

    const first = await request(app)
      .put("/api/v1/admin/announcement")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "First message", enabled: true });
    expect(first.status).toBe(200);
    expect(first.body.data.announcement.id).toBe(1);

    const second = await request(app)
      .put("/api/v1/admin/announcement")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Second message", enabled: false });
    expect(second.status).toBe(200);
    expect(second.body.data.announcement.id).toBe(1);
    expect(second.body.data.announcement.message).toBe("Second message");

    const count = await prisma.announcement.count();
    expect(count).toBe(1);
  });

  it("records an audit log entry on update", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await request(app)
      .put("/api/v1/admin/announcement")
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ message: "Audited message", enabled: true });

    const logs = await prisma.auditLog.findMany({ where: { entityType: "Announcement" } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("ANNOUNCEMENT_UPDATED");
    expect(logs[0].actorId).toBe(admin.id);
  });

  it("admin GET reflects the current state", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const token = tokenFor(admin);
    await request(app)
      .put("/api/v1/admin/announcement")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Visible to admin", enabled: false });

    const res = await request(app).get("/api/v1/admin/announcement").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.announcement.message).toBe("Visible to admin");
    expect(res.body.data.announcement.enabled).toBe(false);
  });
});

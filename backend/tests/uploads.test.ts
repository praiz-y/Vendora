import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { signAccessToken } from "../src/services/token.service";
import { computeSignature } from "../src/modules/uploads/uploads.service";
import { resetDatabase, uniqueEmail, uniqueUsername } from "./helpers";

const app = createApp();

let seq = 0;
function next() {
  seq += 1;
  return seq;
}

async function createUser() {
  const user = await prisma.user.create({
    data: {
      firstName: "Buyer",
      lastName: `${next()}`,
      username: uniqueUsername("upload"),
      email: uniqueEmail("upload"),
      passwordHash: "not-used-in-these-tests",
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

describe("POST /api/v1/uploads/sign", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/api/v1/uploads/sign").send({ folder: "products" });
    expect(res.status).toBe(401);
  });

  it("rejects a folder outside the known set", async () => {
    const user = await createUser();
    const res = await request(app)
      .post("/api/v1/uploads/sign")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ folder: "not-a-real-folder" });
    expect(res.status).toBe(422);
  });

  it("returns 503 when Cloudinary isn't configured (the test environment's real state)", async () => {
    const user = await createUser();
    const res = await request(app)
      .post("/api/v1/uploads/sign")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ folder: "products" });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("UPLOADS_NOT_CONFIGURED");
  });

  it("computes the precomputed SHA1 of folder=hero-slides&timestamp=1700000000demo-secret", () => {
    const precomputedSha1OfKnownInput = "208e90fd66c514638c241c6774a39464969d0102";

    expect(computeSignature("hero-slides", 1700000000, "demo-secret")).toBe(precomputedSha1OfKnownInput);
  });
});

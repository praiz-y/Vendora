import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDatabase, uniqueEmail, uniqueUsername } from "./helpers";

const app = createApp();

function extractCookieValue(setCookieHeader: string[] | undefined, name: string): string {
  const cookie = setCookieHeader?.find((c) => c.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Cookie ${name} not found in response`);
  return cookie.split(";")[0].split("=")[1];
}

async function registerUser(overrides: Partial<Record<string, string>> = {}) {
  const payload = {
    firstName: "Test",
    lastName: "User",
    username: uniqueUsername("user"),
    email: uniqueEmail("user"),
    password: "Password123",
    ...overrides,
  };
  const res = await request(app).post("/api/v1/auth/register").send(payload);
  return { res, payload };
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/v1/auth/register", () => {
  it("registers a new user and returns a safe user + access token + refresh cookie", async () => {
    const { res, payload } = await registerUser();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(payload.email.toLowerCase());
    expect(res.body.data.user.username).toBe(payload.username);
    expect(res.body.data.user.role).toBe("USER");
    expect(res.body.data.user.seller).toBeNull();
    expect(res.body.data.user).not.toHaveProperty("passwordHash");
    expect(res.body.data.accessToken).toEqual(expect.any(String));

    const setCookie = res.headers["set-cookie"] as unknown as string[];
    expect(setCookie.some((c) => c.startsWith("vendora_refresh_token="))).toBe(true);
    expect(setCookie.some((c) => c.includes("HttpOnly"))).toBe(true);

    const created = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    expect(created).not.toBeNull();
    expect(created!.passwordHash).not.toBe(payload.password);

    const cart = await prisma.cart.findUnique({ where: { userId: created!.id } });
    expect(cart).not.toBeNull();
  });

  it("normalizes email casing and rejects a duplicate regardless of case", async () => {
    const { payload } = await registerUser({ email: "Mixed.Case@Vendora.Test" });
    const dupe = await registerUser({
      email: "MIXED.CASE@VENDORA.TEST",
      username: uniqueUsername("dupe"),
    });
    expect(dupe.res.status).toBe(409);
    expect(dupe.res.body.error.code).toBe("EMAIL_TAKEN");
    void payload;
  });

  it("rejects a duplicate username", async () => {
    const { payload } = await registerUser();
    const dupe = await registerUser({ username: payload.username, email: uniqueEmail("other") });
    expect(dupe.res.status).toBe(409);
    expect(dupe.res.body.error.code).toBe("USERNAME_TAKEN");
  });

  it("rejects invalid input with 422", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ firstName: "", lastName: "User", username: "ab", email: "not-an-email", password: "short" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a weak password (no digits)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        firstName: "A",
        lastName: "B",
        username: uniqueUsername("weak"),
        email: uniqueEmail("weak"),
        password: "onlylettersnope",
      });
    expect(res.status).toBe(422);
  });

  it("handles a concurrent duplicate-email race using the DB constraint, not a pre-check", async () => {
    const email = uniqueEmail("race");
    const base = { firstName: "A", lastName: "B", password: "Password123", email };

    const [first, second] = await Promise.all([
      request(app).post("/api/v1/auth/register").send({ ...base, username: uniqueUsername("race1") }),
      request(app).post("/api/v1/auth/register").send({ ...base, username: uniqueUsername("race2") }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);

    const count = await prisma.user.count({ where: { email: email.toLowerCase() } });
    expect(count).toBe(1);
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs in with correct email + password", async () => {
    const { payload } = await registerUser();
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: payload.email, password: payload.password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(payload.username);
  });

  it("logs in with username instead of email", async () => {
    const { payload } = await registerUser();
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: payload.username, password: payload.password });
    expect(res.status).toBe(200);
  });

  it("rejects an incorrect password with a generic error", async () => {
    const { payload } = await registerUser();
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: payload.email, password: "WrongPassword1" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a nonexistent account with the SAME generic error as wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: uniqueEmail("ghost"), password: "WhoKnows123" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.message).toBe("Invalid email/username or password.");
  });

  it("rejects a suspended account after successful password verification", async () => {
    const { payload } = await registerUser();
    await prisma.user.update({ where: { email: payload.email.toLowerCase() }, data: { status: "SUSPENDED" } });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: payload.email, password: payload.password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("issues a new access token and rotates the refresh token", async () => {
    const agent = request.agent(app);
    const { payload } = await registerUser();
    await agent.post("/api/v1/auth/login").send({ identifier: payload.email, password: payload.password });

    const res = await agent.post("/api/v1/auth/refresh");
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });

  it("rejects a missing refresh token", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("NO_REFRESH_TOKEN");
  });

  it("rejects an invalid/garbage refresh token", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").set("Cookie", "vendora_refresh_token=garbage123");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("rejects an expired refresh token", async () => {
    const loginRes = await (async () => {
      const { payload } = await registerUser();
      return request(app).post("/api/v1/auth/login").send({ identifier: payload.email, password: payload.password });
    })();
    const raw = extractCookieValue(loginRes.headers["set-cookie"] as unknown as string[], "vendora_refresh_token");

    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).post("/api/v1/auth/refresh").set("Cookie", `vendora_refresh_token=${raw}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("REFRESH_TOKEN_EXPIRED");
  });

  it("rejects an already-revoked refresh token directly (not via reuse-after-rotation)", async () => {
    const { payload } = await registerUser();
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: payload.email, password: payload.password });
    const raw = extractCookieValue(loginRes.headers["set-cookie"] as unknown as string[], "vendora_refresh_token");

    await prisma.refreshToken.updateMany({ data: { revokedAt: new Date() } });

    const res = await request(app).post("/api/v1/auth/refresh").set("Cookie", `vendora_refresh_token=${raw}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("REFRESH_TOKEN_REUSE_DETECTED");
  });

  it("detects reuse of an already-rotated token and invalidates the whole session", async () => {
    const { payload } = await registerUser();
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: payload.email, password: payload.password });
    const oldRaw = extractCookieValue(loginRes.headers["set-cookie"] as unknown as string[], "vendora_refresh_token");

    const firstRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `vendora_refresh_token=${oldRaw}`);
    const newRaw = extractCookieValue(
      firstRefresh.headers["set-cookie"] as unknown as string[],
      "vendora_refresh_token"
    );

    // Replaying the OLD (now-rotated-away) token must be rejected...
    const reuseAttempt = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `vendora_refresh_token=${oldRaw}`);
    expect(reuseAttempt.status).toBe(401);
    expect(reuseAttempt.body.error.code).toBe("REFRESH_TOKEN_REUSE_DETECTED");

    // ...and the NEW token that replaced it must also now be dead, because
    // reuse detection revokes the entire session, not just the stale token.
    const newTokenAfterReuse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `vendora_refresh_token=${newRaw}`);
    expect(newTokenAfterReuse.status).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("clears the session so the refresh token can no longer be used", async () => {
    const agent = request.agent(app);
    const { payload } = await registerUser();
    await agent.post("/api/v1/auth/login").send({ identifier: payload.email, password: payload.password });

    const logoutRes = await agent.post("/api/v1/auth/logout");
    expect(logoutRes.status).toBe(200);

    const refreshAfterLogout = await agent.post("/api/v1/auth/refresh");
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("is forgiving when there is no session to log out of", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the authenticated user for a valid access token", async () => {
    const { res: registerRes, payload } = await registerUser();
    const token = registerRes.body.data.accessToken;

    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(payload.username);
  });
});

describe("Password reset", () => {
  it("responds identically whether or not the email exists (no enumeration)", async () => {
    const { payload } = await registerUser();
    const known = await request(app).post("/api/v1/auth/forgot-password").send({ email: payload.email });
    const unknown = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: uniqueEmail("ghost") });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
  });

  it("resets the password with a valid token, then rejects reuse of the same token", async () => {
    const { payload } = await registerUser();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: payload.email });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: payload.email.toLowerCase() } });
    const tokenRecord = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });

    // The raw token is never persisted anywhere (only its hash) — recover it
    // the same way the dev-only email stand-in exposes it, by regenerating
    // through the service directly for this white-box test.
    const { issuePasswordResetToken } = await import("../src/services/token.service");
    // Invalidate the token created via the HTTP call above so only the one
    // we mint here (whose raw value we actually have) is live.
    await prisma.passwordResetToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } });
    const { raw } = await issuePasswordResetToken(user.id);

    const resetRes = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: raw, newPassword: "BrandNewPassword1" });
    expect(resetRes.status).toBe(200);

    const loginWithNew = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: payload.email, password: "BrandNewPassword1" });
    expect(loginWithNew.status).toBe(200);

    const reuseRes = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: raw, newPassword: "AnotherPassword2" });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("rejects an expired reset token", async () => {
    const { payload } = await registerUser();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: payload.email.toLowerCase() } });

    const { issuePasswordResetToken } = await import("../src/services/token.service");
    const { raw } = await issuePasswordResetToken(user.id);
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: raw, newPassword: "SomeNewPassword1" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("rejects an invalid/unknown reset token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "not-a-real-token", newPassword: "SomeNewPassword1" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("invalidates existing sessions when the password is reset", async () => {
    const agent = request.agent(app);
    const { payload } = await registerUser();
    await agent.post("/api/v1/auth/login").send({ identifier: payload.email, password: payload.password });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: payload.email.toLowerCase() } });
    const { issuePasswordResetToken } = await import("../src/services/token.service");
    const { raw } = await issuePasswordResetToken(user.id);
    await request(app).post("/api/v1/auth/reset-password").send({ token: raw, newPassword: "BrandNewPassword1" });

    const refreshRes = await agent.post("/api/v1/auth/refresh");
    expect(refreshRes.status).toBe(401);
  });
});

describe("POST /api/v1/auth/change-password", () => {
  it("rejects an incorrect current password", async () => {
    const { res: registerRes } = await registerUser();
    const token = registerRes.body.data.accessToken;

    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "WrongOne123", newPassword: "NewPassword456" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
  });

  it("changes the password and invalidates existing sessions", async () => {
    const agent = request.agent(app);
    const { payload } = await registerUser();
    const loginRes = await agent
      .post("/api/v1/auth/login")
      .send({ identifier: payload.email, password: payload.password });
    const token = loginRes.body.data.accessToken;

    const changeRes = await agent
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: payload.password, newPassword: "FreshPassword789" });
    expect(changeRes.status).toBe(200);

    const refreshRes = await agent.post("/api/v1/auth/refresh");
    expect(refreshRes.status).toBe(401);

    const loginWithNew = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: payload.email, password: "FreshPassword789" });
    expect(loginWithNew.status).toBe(200);
  });
});

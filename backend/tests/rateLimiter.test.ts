import express from "express";
import rateLimit from "express-rate-limit";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { sendError } from "../src/utils/apiResponse";

// The real authRateLimiter is skipped under NODE_ENV=test (see
// middlewares/rateLimiter.ts) so the rest of the suite isn't throttled by
// its own request volume — that skip was manually verified against the real
// limiter in Phase 2's end-to-end testing (see phase-2-report.md). This test
// exercises the underlying express-rate-limit + response-envelope wiring in
// isolation, with a tiny limit so it triggers deterministically.
function buildLimitedApp() {
  const app = express();
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 2,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(res, "Too many requests, please try again later", "RATE_LIMITED", 429);
    },
  });
  app.get("/limited", limiter, (_req, res) => res.json({ ok: true }));
  return app;
}

describe("rate limiting", () => {
  it("allows requests under the limit and rejects once the limit is exceeded", async () => {
    const app = buildLimitedApp();

    const first = await request(app).get("/limited");
    const second = await request(app).get("/limited");
    const third = await request(app).get("/limited");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe("RATE_LIMITED");
  });
});

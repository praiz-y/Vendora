import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { sendError } from "../utils/apiResponse";

// Targeted at sensitive auth endpoints only (register/login/refresh/
// forgot-password/reset-password) — not applied globally, since a blanket
// limit would throttle normal marketplace browsing for no benefit.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // The automated test suite legitimately makes far more than 20 auth
  // requests per run against a shared test-process "IP" — rate limiting is
  // a real, already-manually-verified behavior (see phase-2-report.md), not
  // something the test suite needs to re-prove under its own constraints.
  skip: () => env.nodeEnv === "test",
  handler: (_req, res) => {
    sendError(res, "Too many requests, please try again later", "RATE_LIMITED", 429);
  },
});

// Phase 15: a looser limit than authRateLimiter for authenticated
// write-heavy endpoints that are still worth capping — repeated checkout
// attempts churning stock reservations, refund/report/review spam, or
// change-password brute-forcing against a stolen access token. 60/15min is
// generous for any real user's legitimate use, tight enough to blunt a
// scripted abuse loop.
export const writeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === "test",
  handler: (_req, res) => {
    sendError(res, "Too many requests, please try again later", "RATE_LIMITED", 429);
  },
});

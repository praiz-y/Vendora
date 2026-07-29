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

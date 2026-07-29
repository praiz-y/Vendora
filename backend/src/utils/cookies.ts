import type { Response } from "express";
import { env } from "../config/env";

// Deliberately "/" and not "/api/v1/auth": cookie Path matching is based
// purely on the request's URL path, independent of host/port. Vendora's
// Next.js proxy (src/proxy.ts) needs to see this cookie on requests to
// localhost:3000/account/* to gate those routes — a narrower path scoped to
// the backend's own auth routes would never reach the browser on a
// same-site-but-different-path request to the frontend. HttpOnly already
// keeps it out of JS on both origins; this only widens which *requests*
// carry it, not who can read its value.
const REFRESH_COOKIE_PATH = "/";

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(env.refreshToken.cookieName, token, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.refreshToken.cookieName, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: REFRESH_COOKIE_PATH,
  });
}

import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/token.service";
import { ApiError } from "../utils/ApiError";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

// Pure authentication: verifies the JWT and attaches { id, role } to
// req.user. Deliberately does not check seller/admin authorization — that's
// authorize.ts's job, kept separate so auth and authz can be composed
// independently per route.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    next(ApiError.unauthorized("Authentication required", "UNAUTHENTICATED"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token", "INVALID_ACCESS_TOKEN"));
  }
}

// Like authenticate(), but proceeds (with req.user left undefined) instead of
// rejecting when no/invalid token is present. Useful for routes that behave
// differently for logged-in vs anonymous users without requiring auth.
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // ignore invalid token, treat as anonymous
  }
  next();
}

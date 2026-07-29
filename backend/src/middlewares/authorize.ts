import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { hasActiveSellerCapability, isAdmin } from "../utils/authz";

// Assumes authenticate() already ran. Kept as a separate middleware (not
// folded into authenticate) so authentication and authorization compose
// independently — a route can require login without requiring admin, etc.
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(ApiError.unauthorized());
    return;
  }
  if (!isAdmin(req.user)) {
    next(ApiError.forbidden("Admin access required", "ADMIN_REQUIRED"));
    return;
  }
  next();
}

// Checks the user's Store status live in the database on every request —
// never trusts anything cached in the JWT. A suspended seller is rejected
// here even though their access token is otherwise perfectly valid.
export function requireActiveSeller(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(ApiError.unauthorized());
    return;
  }

  hasActiveSellerCapability(req.user.id)
    .then((isActiveSeller) => {
      if (!isActiveSeller) {
        next(ApiError.forbidden("Active seller capability required", "SELLER_CAPABILITY_REQUIRED"));
        return;
      }
      next();
    })
    .catch(next);
}

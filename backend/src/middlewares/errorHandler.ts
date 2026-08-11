import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { sendError } from "../utils/apiResponse";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, "ROUTE_NOT_FOUND"));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    sendError(res, err.message, err.code, err.statusCode, err.details);
    return;
  }

  // The real message is always logged server-side. It's only ever sent to
  // the client outside production — an unexpected error's raw message
  // (e.g. a Prisma error naming a column/table) is exactly the kind of
  // internal detail an attacker shouldn't get for free in production.
  console.error("Unhandled error:", err);
  const message = env.nodeEnv === "production" ? "Something went wrong" : err instanceof Error ? err.message : "Something went wrong";
  sendError(res, message, "INTERNAL_ERROR", 500);
}

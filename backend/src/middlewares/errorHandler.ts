import type { NextFunction, Request, Response } from "express";
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

  const message = err instanceof Error ? err.message : "Something went wrong";
  console.error("Unhandled error:", err);
  sendError(res, message, "INTERNAL_ERROR", 500);
}

import type { Response } from "express";

export interface ApiSuccessBody<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Request successful",
  statusCode = 200
): Response<ApiSuccessBody<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message = "Something went wrong",
  code = "INTERNAL_ERROR",
  statusCode = 500,
  details?: unknown
): Response<ApiErrorBody> {
  return res.status(statusCode).json({
    success: false,
    message,
    error: { code, details },
  });
}

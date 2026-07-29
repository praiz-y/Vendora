export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, code = "BAD_REQUEST", details?: unknown) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new ApiError(401, code, message);
  }

  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new ApiError(403, code, message);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new ApiError(404, code, message);
  }

  static conflict(message = "Conflict", code = "CONFLICT", details?: unknown) {
    return new ApiError(409, code, message, details);
  }

  static unprocessable(message = "Validation failed", code = "VALIDATION_ERROR", details?: unknown) {
    return new ApiError(422, code, message, details);
  }

  static tooManyRequests(message = "Too many requests, please try again later", code = "RATE_LIMITED") {
    return new ApiError(429, code, message);
  }

  static internal(message = "Something went wrong", code = "INTERNAL_ERROR") {
    return new ApiError(500, code, message);
  }
}

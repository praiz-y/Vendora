import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../utils/ApiError";

type ValidationTarget = "body" | "query" | "params";

// Route -> validate(schema) -> controller -> service -> Prisma. Parses the
// given request part against the schema, replaces it with the parsed
// (and Zod-coerced/defaulted) value, or forwards a 400 ApiError.
export function validate(schema: ZodType, target: ValidationTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(ApiError.unprocessable("Validation failed", "VALIDATION_ERROR", result.error.flatten()));
      return;
    }

    req[target] = result.data;
    next();
  };
}

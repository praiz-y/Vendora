import { ApiError } from "./ApiError";

// Zod's .flatten() shape, sent as ApiError.details for VALIDATION_ERROR
// (backend/src/middlewares/validate.ts).
interface FlattenedZodError {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
}

function isFlattenedZodError(details: unknown): details is FlattenedZodError {
  return typeof details === "object" && details !== null && "fieldErrors" in details;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // The top-level message is always the generic "Validation failed" —
    // the actual per-field reason lives in details.fieldErrors. Without
    // this, every form in the app shows the same unhelpful string
    // regardless of which field or rule actually failed.
    if (error.code === "VALIDATION_ERROR" && isFlattenedZodError(error.details)) {
      const messages = Object.values(error.details.fieldErrors).flat().filter(Boolean) as string[];
      if (messages.length > 0) return messages.join(" ");
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

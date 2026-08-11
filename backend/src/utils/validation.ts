import { z } from "zod";

// Zod's own `.url()` accepts any syntactically valid URL per the WHATWG
// spec — that includes `javascript:`/`data:`/`vbscript:` URIs, not just
// http(s). None of this project's image/logo/banner URL fields should ever
// hold anything but a fetchable http(s) resource; restricting the scheme
// here is defense-in-depth against a stored non-http URL later being used
// somewhere an `<img src>` isn't the only thing that reads it (Phase 15
// hardening pass — found via audit, not from any prior report of a real
// exploit).
export const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), { message: "URL must start with http:// or https://" });

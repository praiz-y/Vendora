import bcrypt from "bcryptjs";
import { z } from "zod";

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Deliberately not hostile: length + a letter + a number, no forced
// special-character/uppercase rules. bcrypt silently ignores bytes past 72,
// so the max is capped there rather than truncating passwords unexpectedly.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(72, "Password must be at most 72 characters long")
  .regex(/[A-Za-z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number");

import { z } from "zod";
import { passwordSchema } from "../../services/password.service";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username must be at most 30 characters long")
  .regex(
    /^[A-Za-z][A-Za-z0-9_]*$/,
    "Username must start with a letter and contain only letters, numbers, and underscores"
  );

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  username: usernameSchema,
  email: z.string().trim().email("Invalid email address"),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Accepts either email or username in one field — the service decides which
// it is by checking for "@". Bounded even though these are "just" lookup
// inputs: an unbounded string sent straight into bcrypt.compare (existing
// passwordHash comparison) is a real, well-known DoS vector — bcrypt's cost
// scales with input size before it even gets to its internal 72-byte
// truncation, so the bound has to happen here, before that call.
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required").max(200),
  password: z.string().min(1, "Password is required").max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").max(200),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(72),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

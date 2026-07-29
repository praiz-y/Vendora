import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username must be at most 30 characters long")
  .regex(
    /^[A-Za-z][A-Za-z0-9_]*$/,
    "Username must start with a letter and contain only letters, numbers, and underscores"
  );

// Deliberately excludes id/role/status/email/seller fields — those are never
// user-editable through this endpoint. Email is intentionally excluded too:
// changing it without a verification flow (not built yet) would create a
// false sense of a verified identity, so it's out of scope for Phase 2.
export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    username: usernameSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const addressSchema = z.object({
  fullName: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(1).max(30),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const updateAddressSchema = addressSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

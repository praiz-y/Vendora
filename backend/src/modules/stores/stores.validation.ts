import { z } from "zod";
import { httpUrlSchema } from "../../utils/validation";

// Shared by the seller application (Phase 3 submission) and store profile
// editing — both describe the same underlying store-identity fields.
export const storeProfileSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(2000),
  logoUrl: httpUrlSchema.optional(),
  bannerUrl: httpUrlSchema.optional(),
  businessCategory: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(1).max(30),
  email: z.string().trim().email(),
  location: z.string().trim().min(1).max(200),
  businessRegistration: z.string().trim().max(200).optional(),
});
export type StoreProfileInput = z.infer<typeof storeProfileSchema>;

export const updateStoreSchema = storeProfileSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

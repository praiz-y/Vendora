import { z } from "zod";
import { httpUrlSchema } from "../../utils/validation";

// Mirrors SellerApplication's columns (storeName/storeDescription/... rather
// than Store's name/description/...) since the two models intentionally use
// different field names for the same concept — see database-architecture.md.
export const sellerApplicationSchema = z.object({
  storeName: z.string().trim().min(2).max(150),
  storeDescription: z.string().trim().min(10).max(2000),
  storeLogoUrl: httpUrlSchema.optional(),
  storeBannerUrl: httpUrlSchema.optional(),
  businessCategory: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(1).max(30),
  email: z.string().trim().email(),
  location: z.string().trim().min(1).max(200),
  businessRegistration: z.string().trim().max(200).optional(),
});
export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;

export const updateSellerApplicationSchema = sellerApplicationSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateSellerApplicationInput = z.infer<typeof updateSellerApplicationSchema>;

export const rejectSellerApplicationSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});
export type RejectSellerApplicationInput = z.infer<typeof rejectSellerApplicationSchema>;

export const listSellerApplicationsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListSellerApplicationsQuery = z.infer<typeof listSellerApplicationsQuerySchema>;

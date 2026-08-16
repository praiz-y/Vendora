import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const archiveReasonSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});
export type ArchiveReasonInput = z.infer<typeof archiveReasonSchema>;

export const listCategoriesQuerySchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

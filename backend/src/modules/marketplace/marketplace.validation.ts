import { z } from "zod";

export const listPublicProductsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  categorySlug: z.string().trim().optional(),
  storeSlug: z.string().trim().optional(),
  type: z.enum(["PHYSICAL", "DIGITAL"]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListPublicProductsQuery = z.infer<typeof listPublicProductsQuerySchema>;

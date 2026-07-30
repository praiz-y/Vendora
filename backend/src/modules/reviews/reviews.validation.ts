import { z } from "zod";

export const createReviewSchema = z.object({
  orderItemId: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const listProductReviewsQuerySchema = z.object({
  productId: z.string().trim().min(1),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListProductReviewsQuery = z.infer<typeof listProductReviewsQuerySchema>;

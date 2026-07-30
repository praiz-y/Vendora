import { z } from "zod";

export const listSellerOrdersQuerySchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListSellerOrdersQuery = z.infer<typeof listSellerOrdersQuerySchema>;

export const updateSellerOrderStatusSchema = z.object({
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});
export type UpdateSellerOrderStatusInput = z.infer<typeof updateSellerOrderStatusSchema>;

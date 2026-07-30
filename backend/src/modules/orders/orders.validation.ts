import { z } from "zod";

export const listOrdersQuerySchema = z.object({
  status: z
    .enum(["PENDING_PAYMENT", "PAID", "PARTIALLY_PROCESSING", "PARTIALLY_SHIPPED", "PARTIALLY_DELIVERED", "COMPLETED", "CANCELLED"])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

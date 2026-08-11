import { z } from "zod";

export const createRefundSchema = z.object({
  sellerOrderId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(1000),
});
export type CreateRefundInput = z.infer<typeof createRefundSchema>;

export const listMyRefundsQuerySchema = z.object({
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "PROCESSED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListMyRefundsQuery = z.infer<typeof listMyRefundsQuerySchema>;

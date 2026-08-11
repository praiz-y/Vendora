import { z } from "zod";

export const listRefundsQuerySchema = z.object({
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "PROCESSED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListRefundsQuery = z.infer<typeof listRefundsQuerySchema>;

export const rejectRefundSchema = z.object({
  reviewNote: z.string().trim().max(1000).optional(),
});
export type RejectRefundInput = z.infer<typeof rejectRefundSchema>;

import { z } from "zod";

export const listUsersQuerySchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// Same shape as every other admin reject-flow reason field in this
// codebase (e.g. sellerApplications.validation.ts's reject schema) —
// Overhaul Phase 10 brings suspend up to that same friction level.
export const suspendReasonSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});
export type SuspendReasonInput = z.infer<typeof suspendReasonSchema>;

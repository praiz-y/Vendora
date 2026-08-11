import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  entityType: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

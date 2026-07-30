import { z } from "zod";

// Overview §24 leaves the exact reasons unspecified ("the exact
// report-resolution system will be implemented later" — this phase). The
// schema column (Phase 1) is a plain string, not a Postgres enum, so this
// list can grow without a migration; it's enforced here for a clean
// dropdown UI and consistent moderation data, not by the database.
export const reportReasons = [
  "COUNTERFEIT",
  "PROHIBITED_ITEM",
  "MISLEADING_DESCRIPTION",
  "INAPPROPRIATE_CONTENT",
  "OTHER",
] as const;

export const createProductReportSchema = z.object({
  productId: z.string().trim().min(1),
  reason: z.enum(reportReasons),
  description: z.string().trim().max(2000).optional(),
});
export type CreateProductReportInput = z.infer<typeof createProductReportSchema>;

export const listProductReportsQuerySchema = z.object({
  status: z.enum(["PENDING", "RESOLVED", "DISMISSED"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListProductReportsQuery = z.infer<typeof listProductReportsQuerySchema>;

export const resolveProductReportSchema = z.object({
  resolutionNote: z.string().trim().max(1000).optional(),
});
export type ResolveProductReportInput = z.infer<typeof resolveProductReportSchema>;

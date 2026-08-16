import { z } from "zod";

// The full, closed set of entityType values any recordAuditLog(...) call
// site in this codebase actually writes — grepped, not guessed. Kept here
// as the source of truth; the frontend's filter dropdown (Overhaul Phase
// 10, replacing the old free-text box) mirrors this same list by hand.
export const AUDIT_LOG_ENTITY_TYPES = [
  "User",
  "Store",
  "Product",
  "SellerApplication",
  "ProductReport",
  "Refund",
  "Category",
  "HeroSlide",
  "Announcement",
] as const;

export const listAuditLogsQuerySchema = z.object({
  entityType: z.enum(AUDIT_LOG_ENTITY_TYPES).optional(),
  action: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

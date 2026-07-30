export const reportReasons = [
  "COUNTERFEIT",
  "PROHIBITED_ITEM",
  "MISLEADING_DESCRIPTION",
  "INAPPROPRIATE_CONTENT",
  "OTHER",
] as const;
export type ReportReason = (typeof reportReasons)[number];

export const reportReasonLabels: Record<ReportReason, string> = {
  COUNTERFEIT: "Counterfeit item",
  PROHIBITED_ITEM: "Prohibited item",
  MISLEADING_DESCRIPTION: "Misleading description",
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  OTHER: "Other",
};

export type ProductReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";

export interface ProductReport {
  id: string;
  reporterId: string;
  productId: string;
  reason: string;
  description: string | null;
  status: ProductReportStatus;
  resolvedById: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductReport extends ProductReport {
  product: { id: string; name: string; slug: string; storeId: string };
  reporter: { id: string; firstName: string; lastName: string; email: string };
  resolvedBy: { id: string; firstName: string; lastName: string } | null;
}

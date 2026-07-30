import { apiClient } from "@/lib/api/client";
import type { ProductReport, ReportReason } from "@/types/productReport";

export interface CreateProductReportInput {
  productId: string;
  reason: ReportReason;
  description?: string;
}

export const productReportsApi = {
  create: (input: CreateProductReportInput) => apiClient.post<{ report: ProductReport }>("/api/v1/product-reports", input),
};

import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { AdminProductReport, ProductReportStatus } from "@/types/productReport";

export interface AdminProductReportsListParams {
  status?: ProductReportStatus;
  page?: number;
  limit?: number;
}

function buildQueryString(params: AdminProductReportsListParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const adminProductReportsApi = {
  list: (params: AdminProductReportsListParams = {}) =>
    apiClient.get<{ reports: AdminProductReport[]; meta: PaginationMeta }>(
      `/api/v1/admin/product-reports${buildQueryString(params)}`
    ),
  getById: (id: string) => apiClient.get<{ report: AdminProductReport }>(`/api/v1/admin/product-reports/${id}`),
  resolve: (id: string, resolutionNote?: string) =>
    apiClient.post<{ report: AdminProductReport }>(`/api/v1/admin/product-reports/${id}/resolve`, { resolutionNote }),
  dismiss: (id: string, resolutionNote?: string) =>
    apiClient.post<{ report: AdminProductReport }>(`/api/v1/admin/product-reports/${id}/dismiss`, { resolutionNote }),
};

import { apiClient } from "@/lib/api/client";
import type { PaginationMeta, SellerApplication, SellerApplicationStatus, SellerApplicationWithApplicant, Store } from "@/types/store";

export interface AdminSellerApplicationsListParams {
  status?: SellerApplicationStatus;
  page?: number;
  limit?: number;
}

function buildQueryString(params: AdminSellerApplicationsListParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const adminSellerApplicationsApi = {
  list: (params: AdminSellerApplicationsListParams = {}) =>
    apiClient.get<{ applications: SellerApplicationWithApplicant[]; meta: PaginationMeta }>(
      `/api/v1/admin/seller-applications${buildQueryString(params)}`
    ),
  getById: (id: string) =>
    apiClient.get<{ application: SellerApplicationWithApplicant }>(`/api/v1/admin/seller-applications/${id}`),
  approve: (id: string) =>
    apiClient.post<{ application: SellerApplication; store: Store }>(
      `/api/v1/admin/seller-applications/${id}/approve`
    ),
  reject: (id: string, reason: string) =>
    apiClient.post<{ application: SellerApplication }>(`/api/v1/admin/seller-applications/${id}/reject`, {
      reason,
    }),
};

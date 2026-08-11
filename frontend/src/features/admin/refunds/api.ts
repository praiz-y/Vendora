import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { AdminRefund, RefundStatus } from "@/types/refund";

export interface AdminRefundsListParams {
  status?: RefundStatus;
  page?: number;
  limit?: number;
}

function buildQueryString(params: AdminRefundsListParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const adminRefundsApi = {
  list: (params: AdminRefundsListParams = {}) =>
    apiClient.get<{ refunds: AdminRefund[]; meta: PaginationMeta }>(`/api/v1/admin/refunds${buildQueryString(params)}`),
  getById: (id: string) => apiClient.get<{ refund: AdminRefund }>(`/api/v1/admin/refunds/${id}`),
  approve: (id: string) => apiClient.post<{ refund: AdminRefund }>(`/api/v1/admin/refunds/${id}/approve`),
  reject: (id: string, reviewNote?: string) =>
    apiClient.post<{ refund: AdminRefund }>(`/api/v1/admin/refunds/${id}/reject`, { reviewNote }),
};

import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { AdminProduct, ProductStatus } from "@/types/product";

export interface AdminProductsListParams {
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

function buildQueryString(params: AdminProductsListParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const adminProductsApi = {
  list: (params: AdminProductsListParams = {}) =>
    apiClient.get<{ products: AdminProduct[]; meta: PaginationMeta }>(`/api/v1/admin/products${buildQueryString(params)}`),
  getById: (id: string) => apiClient.get<{ product: AdminProduct }>(`/api/v1/admin/products/${id}`),
  approve: (id: string) => apiClient.post<{ product: AdminProduct }>(`/api/v1/admin/products/${id}/approve`),
  reject: (id: string, reason: string) =>
    apiClient.post<{ product: AdminProduct }>(`/api/v1/admin/products/${id}/reject`, { reason }),
};

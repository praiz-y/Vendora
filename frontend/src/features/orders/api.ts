import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { Order, OrderStatus } from "@/types/order";

export interface ListMyOrdersParams {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListMyOrdersParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const ordersApi = {
  list: (params: ListMyOrdersParams = {}) =>
    apiClient.get<{ orders: Order[]; meta: PaginationMeta }>(`/api/v1/orders${buildQueryString(params)}`),
  getById: (id: string) => apiClient.get<{ order: Order }>(`/api/v1/orders/${id}`),
  cancel: (id: string) => apiClient.post<{ order: Order }>(`/api/v1/orders/${id}/cancel`),
};

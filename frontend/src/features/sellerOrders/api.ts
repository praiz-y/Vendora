import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { SellerOrderStatus, SellerOrderWithBuyer } from "@/types/order";

export interface ListMySellerOrdersParams {
  status?: SellerOrderStatus;
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListMySellerOrdersParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const sellerOrdersApi = {
  list: (params: ListMySellerOrdersParams = {}) =>
    apiClient.get<{ sellerOrders: SellerOrderWithBuyer[]; meta: PaginationMeta }>(
      `/api/v1/seller-orders${buildQueryString(params)}`
    ),
  getById: (id: string) => apiClient.get<{ sellerOrder: SellerOrderWithBuyer }>(`/api/v1/seller-orders/${id}`),
  updateStatus: (id: string, status: SellerOrderStatus) =>
    apiClient.patch<{ sellerOrder: SellerOrderWithBuyer }>(`/api/v1/seller-orders/${id}/status`, { status }),
};

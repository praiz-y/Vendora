import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { RefundStatus, RefundWithSellerOrder } from "@/types/refund";

export interface CreateRefundInput {
  sellerOrderId: string;
  reason: string;
}

export interface ListMyRefundsParams {
  status?: RefundStatus;
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListMyRefundsParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const refundsApi = {
  create: (input: CreateRefundInput) =>
    apiClient.post<{ refund: RefundWithSellerOrder }>("/api/v1/refunds", input),
  listMine: (params: ListMyRefundsParams = {}) =>
    apiClient.get<{ refunds: RefundWithSellerOrder[]; meta: PaginationMeta }>(`/api/v1/refunds/me${buildQueryString(params)}`),
};

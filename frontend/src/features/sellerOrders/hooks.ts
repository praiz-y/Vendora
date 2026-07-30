"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SellerOrderStatus } from "@/types/order";
import { sellerOrdersApi, type ListMySellerOrdersParams } from "./api";

const LIST_KEY = ["seller-orders"];

export function useMySellerOrders(params: ListMySellerOrdersParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => sellerOrdersApi.list(params),
  });
}

export function useMySellerOrder(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => sellerOrdersApi.getById(id),
    select: (data) => data.sellerOrder,
    enabled: !!id,
  });
}

export function useUpdateSellerOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SellerOrderStatus }) => sellerOrdersApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

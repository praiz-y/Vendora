"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, type ListMyOrdersParams } from "./api";

const LIST_KEY = ["orders"];

export function useMyOrders(params: ListMyOrdersParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => ordersApi.list(params),
  });
}

export function useMyOrder(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => ordersApi.getById(id),
    select: (data) => data.order,
    enabled: !!id,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminProductsApi, type AdminProductsListParams } from "./api";

const LIST_KEY = ["admin", "products"];

export function useAdminProducts(params: AdminProductsListParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => adminProductsApi.list(params),
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => adminProductsApi.getById(id),
    select: (data) => data.product,
  });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProductsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useRejectProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminProductsApi.reject(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

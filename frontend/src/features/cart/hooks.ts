"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { cartApi } from "./api";

const CART_KEY = ["cart"];

export function useCart() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: CART_KEY,
    queryFn: () => cartApi.get(),
    select: (data) => data.cart,
    enabled: status === "authenticated",
  });
}

function invalidateCart(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: CART_KEY });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity?: number }) => cartApi.addItem(productId, quantity),
    onSuccess: () => invalidateCart(queryClient),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => cartApi.updateItem(id, quantity),
    onSuccess: () => invalidateCart(queryClient),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cartApi.removeItem(id),
    onSuccess: () => invalidateCart(queryClient),
  });
}

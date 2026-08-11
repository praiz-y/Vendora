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
    // Overhaul Phase 3: the cart endpoint is guest-accessible now — only
    // withhold the request while auth status itself is still resolving
    // (the very first render, before AuthProvider's bootstrap refresh
    // settles either way), not just for logged-out visitors.
    enabled: status !== "loading",
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

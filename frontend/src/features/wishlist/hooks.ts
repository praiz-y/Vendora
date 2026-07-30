"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { wishlistApi } from "./api";

const WISHLIST_KEY = ["wishlist"];
const CART_KEY = ["cart"];

export function useWishlist() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: WISHLIST_KEY,
    queryFn: () => wishlistApi.get(),
    select: (data) => data.wishlist,
    enabled: status === "authenticated",
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistApi.addItem(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WISHLIST_KEY }),
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wishlistApi.removeItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WISHLIST_KEY }),
  });
}

export function useMoveToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wishlistApi.moveToCart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_KEY });
      queryClient.invalidateQueries({ queryKey: CART_KEY });
    },
  });
}

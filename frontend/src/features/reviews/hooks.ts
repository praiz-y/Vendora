"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewsApi, type CreateReviewInput } from "./api";

export function useProductReviews(productId: string, page = 1) {
  return useQuery({
    queryKey: ["reviews", "product", productId, page],
    queryFn: () => reviewsApi.listForProduct(productId, page),
    enabled: !!productId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => reviewsApi.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", "product", data.review.productId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
}

export function useMyStoreReviews(page = 1) {
  return useQuery({
    queryKey: ["reviews", "me", "store", page],
    queryFn: () => reviewsApi.listMyStoreReviews(page),
  });
}

import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { ProductRatingSummary, Review, StoreReview, StoreReviewsSummary } from "@/types/review";

export interface CreateReviewInput {
  orderItemId: string;
  rating: number;
  comment?: string;
}

export const reviewsApi = {
  listForProduct: (productId: string, page = 1, limit = 20) =>
    apiClient.get<{ reviews: Review[]; meta: PaginationMeta; summary: ProductRatingSummary }>(
      `/api/v1/reviews?productId=${productId}&page=${page}&limit=${limit}`
    ),
  create: (input: CreateReviewInput) => apiClient.post<{ review: Review }>("/api/v1/reviews", input),
  listMyStoreReviews: (page = 1, limit = 20) =>
    apiClient.get<{ reviews: StoreReview[]; meta: PaginationMeta; summary: StoreReviewsSummary }>(
      `/api/v1/reviews/me/store?page=${page}&limit=${limit}`
    ),
};

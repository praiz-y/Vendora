export interface Review {
  id: string;
  userId: string;
  productId: string;
  orderItemId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; firstName: string; lastName: string };
}

export interface StoreReview extends Review {
  product: { id: string; name: string; slug: string };
}

export interface ProductRatingSummary {
  averageRating: number | null;
  reviewCount: number;
}

export interface StoreReviewsSummary extends ProductRatingSummary {
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

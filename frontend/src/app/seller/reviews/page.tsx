"use client";

import { FormMessage } from "@/components/ui/FormMessage";
import { useMyStoreReviews } from "@/features/reviews/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

export default function SellerReviewsPage() {
  const { data, isLoading, isError, error } = useMyStoreReviews();

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Reviews</h2>
        <p className="mt-1 text-sm text-foreground/60">Reviews left by buyers across every product in your store.</p>
      </div>

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-3">
        {data?.reviews.map((review) => (
          <div key={review.id} className="rounded-md border border-black/10 p-4 dark:border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{review.product.name}</p>
              <span className="text-sm text-foreground/60">★ {review.rating}</span>
            </div>
            <p className="mt-1 text-xs text-foreground/50">
              {review.user.firstName} {review.user.lastName} · {new Date(review.createdAt).toLocaleDateString()}
            </p>
            {review.comment && <p className="mt-2 text-sm text-foreground/70">{review.comment}</p>}
          </div>
        ))}
        {data?.reviews.length === 0 && <p className="text-sm text-foreground/60">No reviews yet.</p>}
      </div>
    </div>
  );
}

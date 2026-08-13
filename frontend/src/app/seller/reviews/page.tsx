"use client";

import { StarIcon } from "@/components/icons";
import { FormMessage } from "@/components/ui/FormMessage";
import { useMyStoreReviews } from "@/features/reviews/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { StoreReviewsSummary } from "@/types/review";

function RatingSummary({ summary }: { summary: StoreReviewsSummary }) {
  const rounded = summary.averageRating !== null ? Math.round(summary.averageRating) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex shrink-0 flex-col items-center gap-1">
        <p className="text-3xl font-semibold text-heading">
          {summary.averageRating !== null ? summary.averageRating.toFixed(1) : "—"}
        </p>
        <div className="flex gap-0.5 text-rating-gold">
          {[1, 2, 3, 4, 5].map((n) => (
            <StarIcon key={n} className="h-4 w-4" filled={n <= rounded} />
          ))}
        </div>
        <p className="text-xs text-muted">
          {summary.reviewCount} review{summary.reviewCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = summary.distribution[star];
          const pct = summary.reviewCount > 0 ? (count / summary.reviewCount) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-muted">
              <span className="flex w-8 items-center gap-0.5">
                {star} <StarIcon className="h-3 w-3 text-rating-gold" filled />
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
                <div className="h-full rounded-full bg-rating-gold" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SellerReviewsPage() {
  const { data, isLoading, isError, error } = useMyStoreReviews();

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Reviews</h2>
        <p className="mt-1 text-sm text-muted">Reviews left by buyers across every product in your store.</p>
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {data && data.summary.reviewCount > 0 && <RatingSummary summary={data.summary} />}

      <div className="flex flex-col gap-3">
        {data?.reviews.map((review) => (
          <div key={review.id} className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-heading">{review.product.name}</p>
              <span className="flex items-center gap-1 text-sm text-muted">
                <StarIcon className="h-4 w-4 text-rating-gold" filled />
                {review.rating}
              </span>
            </div>
            <p className="mt-1 text-xs text-light">
              {review.user.firstName} {review.user.lastName} · {new Date(review.createdAt).toLocaleDateString()}
            </p>
            {review.comment && <p className="mt-2 text-sm text-body">{review.comment}</p>}
          </div>
        ))}
        {data?.reviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
      </div>
    </div>
  );
}

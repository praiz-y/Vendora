"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Select } from "@/components/ui/Select";
import { useAddToCart } from "@/features/cart/hooks";
import { useMyEntitlements } from "@/features/entitlements/hooks";
import { useMarketplaceProduct, useRecordProductView } from "@/features/marketplace/hooks";
import { useSubmitProductReport } from "@/features/productReports/hooks";
import { useProductReviews } from "@/features/reviews/hooks";
import { useAddToWishlist, useRemoveFromWishlist, useWishlist } from "@/features/wishlist/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import { useAuthStore } from "@/stores/authStore";
import { reportReasonLabels, reportReasons, type ReportReason } from "@/types/productReport";

function RatingSummary({ averageRating, reviewCount }: { averageRating: number | null; reviewCount: number }) {
  if (averageRating === null) return <p className="text-sm text-foreground/50">No reviews yet</p>;
  return (
    <p className="text-sm text-foreground/70">
      ★ {averageRating.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? "" : "s"}
    </p>
  );
}

function ReportProductForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [reason, setReason] = useState<ReportReason>("OTHER");
  const [description, setDescription] = useState("");
  const submitReport = useSubmitProductReport();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submitReport.mutate(
      { productId, reason, description: description.trim() || undefined },
      { onSuccess: onDone }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/10">
      {submitReport.isError && <FormMessage type="error">{getErrorMessage(submitReport.error)}</FormMessage>}
      <Select label="Reason" name="reportReason" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
        {reportReasons.map((r) => (
          <option key={r} value={r}>
            {reportReasonLabels[r]}
          </option>
        ))}
      </Select>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional details"
        rows={3}
        className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      />
      <Button type="submit" variant="danger" loading={submitReport.isPending} className="self-start">
        Submit report
      </Button>
    </form>
  );
}

function ReviewsSection({ productId }: { productId: string }) {
  const { data, isLoading } = useProductReviews(productId);

  if (isLoading) return null;
  const reviews = data?.reviews ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8">
      <h2 className="mb-4 text-lg font-semibold">Reviews</h2>
      {data?.summary && <RatingSummary averageRating={data.summary.averageRating} reviewCount={data.summary.reviewCount} />}
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-foreground/50">No reviews yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-md border border-black/10 p-4 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {review.user.firstName} {review.user.lastName}
                </span>
                <span className="text-sm text-foreground/60">★ {review.rating}</span>
              </div>
              {review.comment && <p className="mt-2 text-sm text-foreground/70">{review.comment}</p>}
              <p className="mt-2 text-xs text-foreground/40">{new Date(review.createdAt).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const { data: product, isLoading, isError, error } = useMarketplaceProduct(slug);
  const { data: wishlist } = useWishlist();
  const { data: entitlements } = useMyEntitlements();
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  useRecordProductView(product?.slug);

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-foreground/60">Loading…</div>;
  if (isError || !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <FormMessage type="error">{getErrorMessage(error) || "Product not found."}</FormMessage>
      </div>
    );
  }

  const outOfStock = product.type === "PHYSICAL" && product.stockQuantity === 0;
  const wishlistItem = wishlist?.find((item) => item.productId === product.id);
  const alreadyOwned =
    product.type === "DIGITAL" && entitlements?.some((entitlement) => entitlement.productId === product.id);

  function requireAuth(action: () => void) {
    if (status !== "authenticated") {
      router.push(`/login?from=/products/${slug}`);
      return;
    }
    action();
  }

  function handleAddToCart() {
    // Deliberately not gated by requireAuth — guests can add to cart
    // anonymously (Overhaul Phase 3); only Wishlist and Report Product
    // stay login-gated.
    addToCart.mutate({ productId: product!.id, quantity });
  }

  function handleToggleWishlist() {
    requireAuth(() => {
      if (wishlistItem) removeFromWishlist.mutate(wishlistItem.id);
      else addToWishlist.mutate(product!.id);
    });
  }

  const images = product.images.length > 0 ? product.images : [];

  return (
    <>
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-black/5 dark:bg-white/5">
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[activeImage].url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-foreground/40">No image available</span>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setActiveImage(index)}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-current={index === activeImage}
                className={`h-16 w-16 overflow-hidden rounded border ${
                  index === activeImage ? "border-foreground" : "border-black/10 dark:border-white/10"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div>
          <Link href={`/stores/${product.store.slug}`} className="text-sm text-foreground/60 hover:underline">
            {product.store.name}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
          <Link href={`/products?categorySlug=${product.category.slug}`} className="text-sm text-foreground/50 hover:underline">
            {product.category.name}
          </Link>
        </div>

        <p className="text-2xl font-semibold">{formatNaira(product.price)}</p>

        <RatingSummary averageRating={product.rating.averageRating} reviewCount={product.rating.reviewCount} />

        {outOfStock && (
          <span className="w-fit rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">Out of Stock</span>
        )}

        <p className="whitespace-pre-line text-sm text-foreground/70">{product.description}</p>

        {product.type === "PHYSICAL" && product.shippingType && (
          <p className="text-sm text-foreground/60">
            Shipping: {product.shippingType === "FREE" ? "Free" : `${formatNaira(product.shippingFee ?? 0)}`}
          </p>
        )}

        {alreadyOwned ? (
          <div className="flex items-center gap-3">
            <Link href="/account/library">
              <Button>You own this — go to your Library</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {product.type === "PHYSICAL" && !outOfStock && (
                <input
                  type="number"
                  aria-label="Quantity"
                  min={1}
                  max={product.stockQuantity ?? undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-20 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:focus:ring-white/30"
                />
              )}
              <Button onClick={handleAddToCart} disabled={outOfStock} loading={addToCart.isPending}>
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleToggleWishlist}
                loading={addToWishlist.isPending || removeFromWishlist.isPending}
              >
                {wishlistItem ? "Remove from Wishlist" : "Add to Wishlist"}
              </Button>
            </div>

            {addToCart.isError && <FormMessage type="error">{getErrorMessage(addToCart.error)}</FormMessage>}
            {addToWishlist.isError && <FormMessage type="error">{getErrorMessage(addToWishlist.error)}</FormMessage>}
          </>
        )}

        <div className="mt-2">
          {reportSubmitted ? (
            <p className="text-xs text-foreground/50">Report submitted — thanks for letting us know.</p>
          ) : showReportForm ? (
            <ReportProductForm productId={product.id} onDone={() => setReportSubmitted(true)} />
          ) : (
            <button
              type="button"
              onClick={() => requireAuth(() => setShowReportForm(true))}
              className="text-xs text-foreground/40 underline hover:text-foreground/60"
            >
              Report this product
            </button>
          )}
        </div>
      </div>
    </div>
    <ReviewsSection productId={product.id} />
    </>
  );
}

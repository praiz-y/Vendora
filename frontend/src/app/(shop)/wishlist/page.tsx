"use client";

import Link from "next/link";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { useMoveToCart, useRemoveFromWishlist, useWishlist } from "@/features/wishlist/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { toast } from "@/stores/toastStore";
import type { WishlistItem } from "@/types/cart";

const issueMessages: Record<string, string> = {
  PRODUCT_UNAVAILABLE: "No longer available",
  STORE_UNAVAILABLE: "Seller is currently unavailable",
};

function WishlistCard({ item }: { item: WishlistItem }) {
  const removeItem = useRemoveFromWishlist();
  const moveToCart = useMoveToCart();

  return (
    <div className="relative flex flex-col gap-2">
      <ProductCard product={item.product} />
      {/* OUT_OF_STOCK is already covered by ProductCard's own ribbon (same
          underlying stockQuantity check) — only the two issues ProductCard
          has no way to detect on its own get a second overlay here. */}
      {!item.isAvailable && item.issue && issueMessages[item.issue] && (
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-heading/80 px-2 py-1 text-xs font-medium text-white">
          {issueMessages[item.issue]}
        </span>
      )}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() =>
            moveToCart.mutate(item.id, {
              onSuccess: () => toast.success("Moved to cart."),
              onError: (error) => toast.error(getErrorMessage(error)),
            })
          }
          loading={moveToCart.isPending}
          disabled={!item.isAvailable}
        >
          Move to Cart
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            removeItem.mutate(item.id, {
              onSuccess: () => toast.success("Removed from wishlist."),
              onError: (error) => toast.error(getErrorMessage(error)),
            })
          }
          loading={removeItem.isPending}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const authStatus = useRequireAuth();
  const { data: wishlist, isLoading, isError, error } = useWishlist();

  if (authStatus !== "authenticated") {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-heading">Your Wishlist</h1>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {wishlist?.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted">Your wishlist is empty.</p>
          <Link href="/products">
            <Button variant="secondary">Browse products</Button>
          </Link>
        </div>
      )}

      {wishlist && wishlist.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {wishlist.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

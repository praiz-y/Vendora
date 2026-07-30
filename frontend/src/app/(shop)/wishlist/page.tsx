"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { useMoveToCart, useRemoveFromWishlist, useWishlist } from "@/features/wishlist/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { WishlistItem } from "@/types/cart";

const issueMessages: Record<string, string> = {
  PRODUCT_UNAVAILABLE: "No longer available",
  STORE_UNAVAILABLE: "Seller is currently unavailable",
  OUT_OF_STOCK: "Out of stock",
};

function WishlistCard({ item }: { item: WishlistItem }) {
  const removeItem = useRemoveFromWishlist();
  const moveToCart = useMoveToCart();
  const image = item.product.images[0];

  return (
    <div className="flex items-center gap-4 rounded-md border border-black/10 p-4 dark:border-white/10">
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-black/5 dark:bg-white/5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={item.product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] text-foreground/40">No image</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <Link href={`/products/${item.product.slug}`} className="text-sm font-medium hover:underline">
          {item.product.name}
        </Link>
        <p className="text-sm text-foreground/60">{formatNaira(item.product.price)}</p>
        {!item.isAvailable && item.issue && <p className="text-xs text-red-500">{issueMessages[item.issue] ?? "Unavailable"}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={() => moveToCart.mutate(item.id)} loading={moveToCart.isPending} disabled={!item.isAvailable}>
          Move to Cart
        </Button>
        <Button variant="secondary" onClick={() => removeItem.mutate(item.id)} loading={removeItem.isPending}>
          Remove
        </Button>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const authStatus = useRequireAuth();
  const { data: wishlist, isLoading, isError, error } = useWishlist();
  const moveToCart = useMoveToCart();

  if (authStatus !== "authenticated") {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-foreground/60">Loading…</div>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Your Wishlist</h1>

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {moveToCart.isError && <FormMessage type="error">{getErrorMessage(moveToCart.error)}</FormMessage>}
      {wishlist?.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-foreground/60">Your wishlist is empty.</p>
          <Link href="/products">
            <Button variant="secondary">Browse products</Button>
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {wishlist?.map((item) => (
          <WishlistCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

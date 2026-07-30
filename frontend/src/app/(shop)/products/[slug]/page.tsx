"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAddToCart } from "@/features/cart/hooks";
import { useMyEntitlements } from "@/features/entitlements/hooks";
import { useMarketplaceProduct } from "@/features/marketplace/hooks";
import { useAddToWishlist, useRemoveFromWishlist, useWishlist } from "@/features/wishlist/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import { useAuthStore } from "@/stores/authStore";

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
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
    requireAuth(() => addToCart.mutate({ productId: product!.id, quantity }));
  }

  function handleToggleWishlist() {
    requireAuth(() => {
      if (wishlistItem) removeFromWishlist.mutate(wishlistItem.id);
      else addToWishlist.mutate(product!.id);
    });
  }

  const images = product.images.length > 0 ? product.images : [];

  return (
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
                className={`h-16 w-16 overflow-hidden rounded border ${
                  index === activeImage ? "border-foreground" : "border-black/10 dark:border-white/10"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-full w-full object-cover" />
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
      </div>
    </div>
  );
}

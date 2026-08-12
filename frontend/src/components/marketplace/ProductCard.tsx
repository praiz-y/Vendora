"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { CartIcon, HeartIcon } from "@/components/icons";
import { useAddToCart } from "@/features/cart/hooks";
import { useAddToWishlist, useRemoveFromWishlist, useWishlist } from "@/features/wishlist/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import type { PublicProduct } from "@/types/product";

interface ProductCardProps {
  product: PublicProduct;
  // Store Page (Part 10) omits the store-name line — redundant there, since
  // the buyer is already on that store's page. Every other surface keeps it.
  hideStoreName?: boolean;
}

export function ProductCard({ product, hideStoreName = false }: ProductCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const authStatus = useAuthStore((s) => s.status);
  const { data: wishlist } = useWishlist();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const addToCart = useAddToCart();

  const image = product.images.find((img) => img.isPrimary) ?? product.images[0];
  const outOfStock = product.type === "PHYSICAL" && product.stockQuantity === 0;
  const wishlistItem = wishlist?.find((item) => item.productId === product.id);
  const isWishlisted = Boolean(wishlistItem);

  function handleToggleWishlist(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Wishlist stays login-gated (Overhaul Part 5) — send a guest to login
    // and back, same `from` mechanism as everywhere else in this app.
    if (authStatus !== "authenticated") {
      router.push(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }

    if (wishlistItem) {
      removeFromWishlist.mutate(wishlistItem.id, {
        onSuccess: () => toast.success("Removed from wishlist."),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      addToWishlist.mutate(product.id, {
        onSuccess: () => toast.success("Added to wishlist."),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
  }

  function handleQuickAddToCart(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Deliberately no auth check — guests can add to cart anonymously
    // (Overhaul Phase 3).
    addToCart.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => toast.success("Added to cart."),
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="flex flex-col overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-border-strong"
    >
      <div className="relative flex aspect-square items-center justify-center bg-surface-alt">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-light">No image</span>
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded bg-heading/70 px-2 py-1 text-xs font-medium text-white">
            Out of Stock
          </span>
        )}
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isWishlisted}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-body shadow-sm hover:text-primary"
        >
          <HeartIcon className={`h-4.5 w-4.5 ${isWishlisted ? "text-primary" : ""}`} filled={isWishlisted} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {!hideStoreName && <p className="text-xs text-muted">{product.store.name}</p>}
        <p className="text-sm font-medium leading-snug text-heading">{product.name}</p>
        {product.rating.averageRating !== null && (
          <p className="text-xs text-muted">
            ★ {product.rating.averageRating.toFixed(1)} ({product.rating.reviewCount})
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <p className="text-sm font-semibold text-heading">{formatNaira(product.price)}</p>
          <button
            type="button"
            onClick={handleQuickAddToCart}
            disabled={outOfStock || addToCart.isPending}
            aria-label="Add to cart"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CartIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

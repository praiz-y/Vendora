"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useCart } from "@/features/cart/hooks";
import { useWishlist } from "@/features/wishlist/hooks";
import { useAuthStore } from "@/stores/authStore";

export function SiteHeader() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const { data: cart } = useCart();
  const { data: wishlist } = useWishlist();
  const [search, setSearch] = useState("");

  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const wishlistCount = wishlist?.length ?? 0;

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const query = search.trim();
    router.push(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          Vendora
        </Link>

        <form onSubmit={handleSearch} className="flex flex-1 min-w-[200px] max-w-md">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:focus:ring-white/30"
          />
        </form>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/products" className="text-foreground/70 hover:text-foreground">
            Browse
          </Link>
          <Link href="/wishlist" className="text-foreground/70 hover:text-foreground">
            Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ""}
          </Link>
          <Link href="/cart" className="text-foreground/70 hover:text-foreground">
            Cart{cartCount > 0 ? ` (${cartCount})` : ""}
          </Link>

          {status === "authenticated" && user ? (
            <>
              {user.isAdmin && (
                <Link href="/admin" className="text-foreground/70 hover:text-foreground">
                  Admin
                </Link>
              )}
              {user.seller?.status === "ACTIVE" && (
                <Link href="/seller" className="text-foreground/70 hover:text-foreground">
                  Seller Dashboard
                </Link>
              )}
              <Link href="/account/profile" className="font-medium text-foreground">
                {user.firstName}
              </Link>
            </>
          ) : (
            <Link href="/login" className="font-medium text-foreground">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

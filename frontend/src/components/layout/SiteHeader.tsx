"use client";

import Link from "next/link";
import { useState } from "react";
import { CartIcon, SearchIcon, UserIcon } from "@/components/icons";
import { useCart } from "@/features/cart/hooks";
import { useWishlist } from "@/features/wishlist/hooks";
import { useAuthStore } from "@/stores/authStore";
import { AccountMenu } from "./AccountMenu";
import { SearchOverlay } from "./SearchOverlay";

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function SiteHeader() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const { data: cart } = useCart();
  const { data: wishlist } = useWishlist();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const wishlistCount = wishlist?.length ?? 0;

  return (
    <header className="border-b border-border bg-surface">
      {/* Desktop */}
      <div className="mx-auto hidden max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 md:grid">
        <nav className="flex items-center gap-6 text-sm font-medium text-body">
          <Link href="/products" className="hover:text-primary">
            Browse
          </Link>
          <Link href="/wishlist" className="relative hover:text-primary">
            Wishlist
            {wishlistCount > 0 && <CountBadge count={wishlistCount} />}
          </Link>
        </nav>

        <Link href="/" className="justify-self-center text-xl font-semibold tracking-tight text-primary">
          Vendora
        </Link>

        <div className="flex items-center justify-end gap-5 text-sm font-medium text-body">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search products"
            className="hover:text-primary"
          >
            <SearchIcon className="h-5 w-5" />
          </button>
          <Link href="/cart" className="relative hover:text-primary" aria-label="Cart">
            <CartIcon className="h-5 w-5" />
            {cartCount > 0 && <CountBadge count={cartCount} />}
          </Link>

          {status === "authenticated" && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-1.5 hover:text-primary"
              >
                <UserIcon className="h-5 w-5" />
                {user.firstName}
              </button>
              {accountOpen && <AccountMenu variant="dropdown" onClose={() => setAccountOpen(false)} />}
            </div>
          ) : (
            <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
              Log in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <Link href="/" className="text-lg font-semibold tracking-tight text-primary">
          Vendora
        </Link>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search products"
          className="text-body hover:text-primary"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

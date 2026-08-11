"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CartIcon, GridIcon, HeartIcon, HomeIcon, UserIcon } from "@/components/icons";
import { useCart } from "@/features/cart/hooks";
import { useWishlist } from "@/features/wishlist/hooks";
import { useAuthStore } from "@/stores/authStore";
import { AccountMenu } from "./AccountMenu";

function TabBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function tabClasses(active: boolean) {
  return `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
    active ? "text-primary" : "text-muted"
  }`;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const { data: cart } = useCart();
  const { data: wishlist } = useWishlist();
  const [accountOpen, setAccountOpen] = useState(false);

  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const wishlistCount = wishlist?.length ?? 0;

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <Link href="/" className={tabClasses(isActive("/"))}>
          <HomeIcon className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/products" className={tabClasses(isActive("/products"))}>
          <GridIcon className="h-5 w-5" />
          <span>Browse</span>
        </Link>
        <Link href="/wishlist" className={tabClasses(isActive("/wishlist"))}>
          <span className="relative">
            <HeartIcon className="h-5 w-5" />
            {wishlistCount > 0 && <TabBadge count={wishlistCount} />}
          </span>
          <span>Wishlist</span>
        </Link>
        <Link href="/cart" className={tabClasses(isActive("/cart"))}>
          <span className="relative">
            <CartIcon className="h-5 w-5" />
            {cartCount > 0 && <TabBadge count={cartCount} />}
          </span>
          <span>Cart</span>
        </Link>
        {status === "authenticated" ? (
          <button type="button" onClick={() => setAccountOpen(true)} className={tabClasses(accountOpen)}>
            <UserIcon className="h-5 w-5" />
            <span>Account</span>
          </button>
        ) : (
          <Link href="/login" className={tabClasses(isActive("/login"))}>
            <UserIcon className="h-5 w-5" />
            <span>Account</span>
          </Link>
        )}
      </nav>
      {accountOpen && <AccountMenu variant="sheet" onClose={() => setAccountOpen(false)} />}
    </>
  );
}

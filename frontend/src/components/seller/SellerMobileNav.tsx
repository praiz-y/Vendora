"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChartIcon, GridIcon, HomeIcon, MoreIcon, CartIcon as OrdersIcon, StarIcon, UserIcon } from "@/components/icons";

const primaryTabs = [
  { href: "/seller", label: "Dashboard", icon: HomeIcon },
  { href: "/seller/products", label: "Products", icon: GridIcon },
  { href: "/seller/orders", label: "Orders", icon: OrdersIcon },
  { href: "/seller/analytics", label: "Analytics", icon: ChartIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/seller" ? pathname === "/seller" : pathname.startsWith(href);
}

function tabClasses(active: boolean) {
  return `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
    active ? "text-primary" : "text-muted"
  }`;
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:hidden">
      <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-heading/40" />
      <div className="relative w-full rounded-t-2xl border border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-heading">More</span>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted">
            ✕
          </button>
        </div>
        <div className="py-1">
          <Link href="/seller/reviews" onClick={onClose} className="flex items-center gap-2 px-4 py-2.5 text-sm text-body hover:bg-surface-alt">
            <StarIcon className="h-4 w-4" /> Reviews
          </Link>
          <Link href="/seller/profile" onClick={onClose} className="flex items-center gap-2 px-4 py-2.5 text-sm text-body hover:bg-surface-alt">
            <UserIcon className="h-4 w-4" /> Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

// Mobile only — a trimmed 5-item bar (4 tabs + More), never blended with
// the consumer bottom bar from Phase 2 (structurally guaranteed: /seller/*
// has its own layout, never renders under (shop)/layout.tsx).
export function SellerMobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = pathname.startsWith("/seller/reviews") || pathname.startsWith("/seller/profile");

  return (
    <>
      <nav
        aria-label="Seller dashboard (mobile)"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primaryTabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={tabClasses(isActive(pathname, tab.href))}>
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} className={tabClasses(moreActive || moreOpen)}>
          <MoreIcon className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
    </>
  );
}

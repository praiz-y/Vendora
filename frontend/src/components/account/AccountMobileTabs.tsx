"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/address", label: "Addresses" },
  { href: "/orders", label: "Orders" },
  { href: "/account/library", label: "Library" },
  { href: "/account/selling", label: "Selling" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/orders" ? pathname === "/orders" || pathname.startsWith("/orders/") : pathname.startsWith(href);
}

// Mobile-only replacement for AccountSidebar (Overhaul Phase 15) — a
// horizontal scroll strip, not a sidebar and not a second bottom bar,
// since MobileBottomNav already owns that space.
export function AccountMobileTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="flex gap-2 overflow-x-auto border-b border-border bg-surface px-4 py-3 md:hidden">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ${
              active ? "bg-heading text-surface" : "border border-border text-body"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

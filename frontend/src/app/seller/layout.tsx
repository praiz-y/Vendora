"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useRequireActiveSeller } from "@/features/auth/useRequireActiveSeller";
import { useMyStore } from "@/features/stores/hooks";

// Nav mirrors the seller-dashboard tabs from docs/roadmap.md Phase 3 — every
// tab is now real, filled in incrementally through Phases 4/8/10/11.
const navItems = [
  { href: "/seller", label: "Dashboard" },
  { href: "/seller/products", label: "Products" },
  { href: "/seller/orders", label: "Orders" },
  { href: "/seller/analytics", label: "Analytics" },
  { href: "/seller/reviews", label: "Reviews" },
  { href: "/seller/profile", label: "Profile" },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const gate = useRequireActiveSeller();
  const { data: store } = useMyStore();
  const pathname = usePathname();

  if (gate !== "authorized") {
    return (
      <>
        <meta name="robots" content="noindex, nofollow" />
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
    <meta name="robots" content="noindex, nofollow" />
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-heading">Seller Dashboard</h1>
          <p className="text-sm text-muted">{store?.name}</p>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex flex-wrap gap-4 border-b border-border">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`border-b-2 px-1 pb-2 text-sm font-medium ${
              pathname === item.href
                ? "border-primary text-heading"
                : "border-transparent text-muted hover:text-heading"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
    </>
  );
}

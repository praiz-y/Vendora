"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequireActiveSeller } from "@/features/auth/useRequireActiveSeller";
import { useMyStore } from "@/features/stores/hooks";

// Nav mirrors the seller-dashboard tabs from docs/roadmap.md Phase 3/8/10/11:
// only Profile is implemented this phase — the rest render placeholder pages
// until the phase that owns their data fills them in.
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
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-foreground/60">Loading…</p>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold">Seller Dashboard</h1>
        <p className="text-sm text-foreground/60">{store?.name}</p>
      </div>

      <nav className="flex flex-wrap gap-4 border-b border-black/10 dark:border-white/10">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`border-b-2 px-1 pb-2 text-sm font-medium ${
              pathname === item.href
                ? "border-foreground text-foreground"
                : "border-transparent text-foreground/50 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}

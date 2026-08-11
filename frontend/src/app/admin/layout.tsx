"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequireAdmin } from "@/features/auth/useRequireAdmin";

// The Admin Foundation shell (docs/roadmap.md Phase 3): one gated layout +
// nav that every later admin-touching phase (product moderation, reports,
// refunds, ...) adds a screen onto, instead of building its own one-off
// admin tooling.
const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/seller-applications", label: "Seller Applications" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/product-reports", label: "Product Reports" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit-logs", label: "Audit Log" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = useRequireAdmin();
  const pathname = usePathname();

  if (gate !== "authorized") {
    return (
      <>
        <meta name="robots" content="noindex, nofollow" />
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-foreground/60">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
    <meta name="robots" content="noindex, nofollow" />
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <h1 className="text-xl font-semibold">Admin</h1>

      <nav className="flex flex-wrap gap-4 border-b border-black/10 dark:border-white/10">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`border-b-2 px-1 pb-2 text-sm font-medium ${
              (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href))
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
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, GridIcon, HomeIcon, StarIcon, CartIcon as OrdersIcon, UserIcon } from "@/components/icons";

const navItems = [
  { href: "/seller", label: "Dashboard", icon: HomeIcon },
  { href: "/seller/products", label: "Products", icon: GridIcon },
  { href: "/seller/orders", label: "Orders", icon: OrdersIcon },
  { href: "/seller/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/seller/reviews", label: "Reviews", icon: StarIcon },
  { href: "/seller/profile", label: "Profile", icon: UserIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/seller" ? pathname === "/seller" : pathname.startsWith(href);
}

// Desktop only — replaces the old top-tab-bar (Overhaul Phase 9). The
// mobile equivalent is SellerMobileNav's 5-item bottom bar.
export function SellerSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Seller dashboard (desktop)" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4 md:flex">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
              active ? "bg-primary-light text-primary" : "text-body hover:bg-surface-alt hover:text-heading"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

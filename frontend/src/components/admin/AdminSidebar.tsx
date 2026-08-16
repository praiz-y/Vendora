"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardIcon,
  FlagIcon,
  GridIcon,
  HomeIcon,
  ImagesIcon,
  ListIcon,
  MegaphoneIcon,
  RefundIcon,
  TagIcon,
  UserIcon,
} from "@/components/icons";
import { useAdminOverview } from "@/features/adminDashboard/hooks";

const navItems = [
  { href: "/admin", label: "Overview", icon: HomeIcon, countKey: undefined },
  { href: "/admin/seller-applications", label: "Seller Applications", icon: ClipboardIcon, countKey: "sellerApplications" as const },
  { href: "/admin/products", label: "Products", icon: GridIcon, countKey: "products" as const },
  { href: "/admin/categories", label: "Categories", icon: TagIcon, countKey: undefined },
  { href: "/admin/product-reports", label: "Product Reports", icon: FlagIcon, countKey: "productReports" as const },
  { href: "/admin/refunds", label: "Refunds", icon: RefundIcon, countKey: "refunds" as const },
  { href: "/admin/users", label: "Users", icon: UserIcon, countKey: undefined },
  { href: "/admin/audit-logs", label: "Audit Log", icon: ListIcon, countKey: undefined },
  { href: "/admin/announcement", label: "Announcement", icon: MegaphoneIcon, countKey: undefined },
  { href: "/admin/hero-slides", label: "Hero Slides", icon: ImagesIcon, countKey: undefined },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: overview } = useAdminOverview();

  return (
    <>
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        const count = item.countKey ? overview?.pendingActions[item.countKey] : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium ${
              active ? "bg-primary-light text-primary-hover" : "text-body hover:bg-surface-alt hover:text-heading"
            }`}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              {item.label}
            </span>
            {!!count && count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-hover px-1 text-[10px] font-semibold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

// Desktop only — replaces the old top-tab-bar (Overhaul Phase 10). The
// mobile equivalent (AdminMobileNav) reuses AdminNavLinks in a slide-in
// sheet instead of a 5-item bottom bar — 10 sections is too many to fit a
// bottom bar meaningfully, and unlike Seller Dashboard, admin is
// overwhelmingly a desktop back-office tool.
export function AdminSidebar() {
  return (
    <nav aria-label="Admin (desktop)" className="hidden w-64 shrink-0 flex-col gap-1 border-r border-border-admin bg-surface p-4 md:flex">
      <AdminNavLinks />
    </nav>
  );
}

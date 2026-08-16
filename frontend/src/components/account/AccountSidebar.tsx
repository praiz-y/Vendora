"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, ClipboardIcon, LogoutIcon, MapPinIcon, StoreIcon, UserIcon } from "@/components/icons";
import { useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/stores/authStore";

const navItems = [
  { href: "/account/profile", label: "Profile", icon: UserIcon },
  { href: "/account/address", label: "Addresses", icon: MapPinIcon },
  { href: "/orders", label: "Orders", icon: ClipboardIcon },
  { href: "/account/library", label: "Library", icon: BookIcon },
  { href: "/account/selling", label: "Selling", icon: StoreIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/orders" ? pathname === "/orders" || pathname.startsWith("/orders/") : pathname.startsWith(href);
}

// Desktop only (Overhaul Phase 15) — the mobile equivalent is
// AccountMobileTabs' horizontal scroll strip, not a second bottom bar,
// since the site's own MobileBottomNav already occupies that space.
export function AccountSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <nav aria-label="Account (desktop)" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4 md:flex">
      <div className="mb-4 flex items-center gap-3 px-1">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          {user?.firstName?.charAt(0)?.toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-heading">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </div>
      </div>

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

      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-alt hover:text-heading disabled:opacity-60"
      >
        <LogoutIcon className="h-5 w-5" />
        Log out
      </button>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useLogout } from "@/features/auth/hooks";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { useAuthStore } from "@/stores/authStore";

const navItems = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/address", label: "Addresses" },
  { href: "/orders", label: "Orders" },
  { href: "/account/library", label: "Library" },
  { href: "/account/selling", label: "Selling" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const status = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const pathname = usePathname();

  if (status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-foreground/60">Loading…</p>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Account</h1>
          <p className="text-sm text-foreground/60">{user?.email}</p>
        </div>
        <Button variant="secondary" onClick={() => logout.mutate()} loading={logout.isPending}>
          Log out
        </Button>
      </div>

      <nav className="flex gap-4 border-b border-black/10 dark:border-white/10">
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

"use client";

import { AccountMobileTabs } from "@/components/account/AccountMobileTabs";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { useRequireAuth } from "@/features/auth/useRequireAuth";

// Orders lives outside /account/* in the URL, but it's one of the five
// links AccountSidebar shows, so it gets its own thin layout rendering
// that same shared sidebar — otherwise the sidebar would disappear the
// moment someone clicked into Orders (Overhaul Phase 15).
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  const status = useRequireAuth();

  if (status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex">
      <AccountSidebar />
      <div className="min-w-0 flex-1">
        <AccountMobileTabs />
        {children}
      </div>
    </div>
  );
}

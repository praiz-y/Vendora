"use client";

import { AccountMobileTabs } from "@/components/account/AccountMobileTabs";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { useRequireAuth } from "@/features/auth/useRequireAuth";

// Sidebar (desktop) + horizontal scroll tabs (mobile) replace the old
// top-tab-bar (Overhaul Phase 15). The sticky SiteHeader, Footer, and
// MobileBottomNav now come from the (shop) layout this is nested inside,
// not duplicated here — this layout only adds what's specific to Account.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const status = useRequireAuth();

  if (status !== "authenticated") {
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
      <div className="flex">
        <AccountSidebar />
        <div className="min-w-0 flex-1">
          <AccountMobileTabs />
          {children}
        </div>
      </div>
    </>
  );
}

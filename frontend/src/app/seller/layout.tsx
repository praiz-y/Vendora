"use client";

import { SellerMobileNav } from "@/components/seller/SellerMobileNav";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { SellerTopBar } from "@/components/seller/SellerTopBar";
import { useRequireActiveSeller } from "@/features/auth/useRequireActiveSeller";
import { useMyStore } from "@/features/stores/hooks";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const gate = useRequireActiveSeller();
  const { data: store } = useMyStore();

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
      <div className="flex min-h-screen">
        <SellerSidebar />
        <div className="flex flex-1 flex-col">
          <SellerTopBar store={store} />
          {/* pb-20 clears SellerMobileNav's fixed bottom bar on mobile —
              not needed on desktop, where that bar doesn't render. */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-2 md:px-8 md:pb-8">{children}</main>
        </div>
        <SellerMobileNav />
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { useRequireAdmin } from "@/features/auth/useRequireAdmin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = useRequireAdmin();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      <AdminMobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen" inert={mobileNavOpen}>
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <AdminTopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </>
  );
}

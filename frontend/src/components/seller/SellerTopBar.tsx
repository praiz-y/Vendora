"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon, UserIcon } from "@/components/icons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { Store } from "@/types/store";
import { SellerAccountMenu } from "./SellerAccountMenu";

// Replaces the old bare NotificationBell-in-the-corner (Overhaul Phase 9):
// an exit link, notifications (Phase 2's page, reusing the same bell), and
// an identity-scoped Account menu.
export function SellerTopBar({ store }: { store: Store | undefined }) {
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-8">
      <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-heading">
        <ChevronLeftIcon className="h-4 w-4" />
        Back to Vendora
      </Link>

      <div className="flex items-center gap-5">
        <NotificationBell />
        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-body hover:text-heading"
          >
            <UserIcon className="h-5 w-5" />
            <span className="hidden sm:inline">{store?.name ?? "Account"}</span>
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          {accountOpen && <SellerAccountMenu store={store} onClose={() => setAccountOpen(false)} />}
        </div>
      </div>
    </div>
  );
}

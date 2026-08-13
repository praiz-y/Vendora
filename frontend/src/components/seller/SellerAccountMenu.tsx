"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LogoutIcon, StoreIcon, UserIcon } from "@/components/icons";
import { useLogout } from "@/features/auth/hooks";
import type { Store } from "@/types/store";

interface SellerAccountMenuProps {
  store: Store | undefined;
  onClose: () => void;
}

// View storefront / Switch to buying / Log out — the top utility bar's
// Account menu (Overhaul Phase 9). "Switch to buying" and the top bar's own
// standalone "Back to Vendora" link both lead back to the consumer site;
// the plan calls for both as separate affordances, not a duplicate to trim.
export function SellerAccountMenu({ store, onClose }: SellerAccountMenuProps) {
  const logout = useLogout();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const rowClasses = "flex items-center gap-2 px-4 py-2.5 text-sm text-body hover:bg-surface-alt";

  return (
    <div ref={containerRef} className="absolute right-0 top-full z-30 mt-2 w-56 rounded-md border border-border bg-surface py-1 shadow-lg">
      {store && (
        <Link href={`/stores/${store.slug}`} onClick={onClose} className={rowClasses}>
          <StoreIcon className="h-4 w-4" /> View storefront
        </Link>
      )}
      <Link href="/" onClick={onClose} className={rowClasses}>
        <UserIcon className="h-4 w-4" /> Switch to buying
      </Link>
      <button
        type="button"
        onClick={() => {
          onClose();
          logout.mutate();
        }}
        className={`w-full text-left ${rowClasses}`}
      >
        <LogoutIcon className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}

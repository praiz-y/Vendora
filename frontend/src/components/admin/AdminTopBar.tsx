"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, LogoutIcon, MenuIcon, UserIcon } from "@/components/icons";
import { useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/stores/authStore";

// Account/logout menu only — no "back to shopping" link. Admin uses a
// fully separate login, not a dual-role identity like a seller-who's-
// also-a-buyer, so there's no "other mode" to switch back to (Part 14).
function AdminAccountMenu({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      role="menu"
      aria-label="Account menu"
      className="absolute right-0 top-full z-30 mt-2 w-56 animate-admin-pop-in rounded-md border border-border-admin bg-surface py-1 shadow-lg"
    >
      <div className="border-b border-border-admin px-4 py-2 text-xs text-muted">{user?.email}</div>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          logout.mutate();
        }}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-body hover:bg-surface-alt"
      >
        <LogoutIcon className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}

export function AdminTopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-border-admin bg-surface px-4 py-3 md:px-8">
      <button type="button" onClick={onOpenMobileNav} aria-label="Open admin menu" className="text-body md:hidden">
        <MenuIcon className="h-5 w-5" />
      </button>
      <span className="hidden text-sm font-semibold text-heading md:inline">Admin</span>

      <div className="relative ml-auto">
        <button
          type="button"
          onClick={() => setAccountOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          className="flex items-center gap-1.5 text-sm font-medium text-body hover:text-heading"
        >
          <UserIcon className="h-5 w-5" />
          <span className="hidden sm:inline">{user?.firstName ?? "Account"}</span>
          <ChevronDownIcon className="h-4 w-4" />
        </button>
        {accountOpen && <AdminAccountMenu onClose={() => setAccountOpen(false)} />}
      </div>
    </div>
  );
}

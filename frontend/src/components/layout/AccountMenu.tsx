"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLogout } from "@/features/auth/hooks";
import { useNotifications } from "@/features/notifications/hooks";
import { useAuthStore } from "@/stores/authStore";

interface AccountMenuProps {
  onClose: () => void;
  variant: "dropdown" | "sheet";
}

export function AccountMenu({ onClose, variant }: AccountMenuProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data } = useNotifications({ limit: 1 });
  const unreadCount = data?.unreadCount ?? 0;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "dropdown") return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variant, onClose]);

  const rowClasses = "flex items-center justify-between px-4 py-2.5 text-sm text-body hover:bg-surface-alt";

  const items = (
    <>
      <Link href="/notifications" onClick={onClose} className={rowClasses}>
        Notifications
        {unreadCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
      {user?.seller?.status === "ACTIVE" && (
        <Link href="/seller" onClick={onClose} className={`block ${rowClasses}`}>
          Seller Dashboard
        </Link>
      )}
      <Link href="/account/profile" onClick={onClose} className={`block ${rowClasses}`}>
        Profile
      </Link>
      <button
        type="button"
        onClick={() => {
          onClose();
          logout.mutate();
        }}
        className={`w-full text-left ${rowClasses}`}
      >
        Log out
      </button>
    </>
  );

  if (variant === "sheet") {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:hidden">
        <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-heading/40" />
        <div className="relative w-full rounded-t-2xl border border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-heading">Account</span>
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted">
              ✕
            </button>
          </div>
          <div className="py-1">{items}</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute right-0 top-full z-30 mt-2 w-56 rounded-md border border-border bg-surface py-1 shadow-lg">
      {items}
    </div>
  );
}

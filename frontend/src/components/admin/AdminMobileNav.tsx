"use client";

import { useEffect, useRef } from "react";
import { AdminNavLinks } from "./AdminSidebar";

// Slide-in sheet triggered from AdminTopBar's hamburger — 10 sections is
// too many for a bottom-tab bar (unlike Seller Dashboard's 6), and admin
// is overwhelmingly a desktop back-office tool, so a full-list sheet
// (reusing the exact same AdminNavLinks the desktop sidebar renders) is
// simpler than inventing a trimmed mobile-only nav shape.
export function AdminMobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 animate-admin-backdrop-in bg-heading/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className="relative flex h-full w-72 animate-admin-sheet-in flex-col gap-1 overflow-y-auto border-r border-border-admin bg-surface p-4 shadow-lg"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-heading">Admin</span>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close" className="text-muted">
            ✕
          </button>
        </div>
        <AdminNavLinks onNavigate={onClose} />
      </div>
    </div>
  );
}

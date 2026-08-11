"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

// Client-side gate for /account/*, /checkout, /orders, etc. This is a UX
// convenience, not the real security boundary — the backend independently
// rejects any unauthenticated or unauthorized request regardless of what
// this hook does. Carries the current path as `from` so /login can bounce
// the visitor back here after signing in (Overhaul Phase 3) — every page
// using this shared hook gets that for free, including checkout, which the
// plan calls out by name.
export function useRequireAuth() {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/login?from=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  return status;
}

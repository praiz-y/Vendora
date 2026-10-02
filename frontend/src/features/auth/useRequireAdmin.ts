"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export type GateStatus = "loading" | "authorized" | "unauthorized";

// Client-side gate for /admin/*, mirroring useRequireAuth's role: a UX
// convenience only. The backend's requireAdmin middleware is the real
// enforcement point regardless of what this hook does.
//
// Carries `from` on the redirect to /login, same as useRequireAuth — an
// admin logging in from a cold session lands back on /admin (or whichever
// admin page they'd bookmarked) instead of the buyer homepage default.
export function useRequireAdmin(): GateStatus {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && !user?.isAdmin) {
      router.replace("/");
    }
  }, [status, user, router, pathname]);

  if (status === "authenticated" && user?.isAdmin) return "authorized";
  if (status === "unauthenticated" || (status === "authenticated" && !user?.isAdmin)) return "unauthorized";
  return "loading";
}

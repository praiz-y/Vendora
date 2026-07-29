"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export type GateStatus = "loading" | "authorized" | "unauthorized";

// Client-side gate for /admin/*, mirroring useRequireAuth's role: a UX
// convenience only. The backend's requireAdmin middleware is the real
// enforcement point regardless of what this hook does.
export function useRequireAdmin(): GateStatus {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && !user?.isAdmin) {
      router.replace("/");
    }
  }, [status, user, router]);

  if (status === "authenticated" && user?.isAdmin) return "authorized";
  if (status === "unauthenticated" || (status === "authenticated" && !user?.isAdmin)) return "unauthorized";
  return "loading";
}

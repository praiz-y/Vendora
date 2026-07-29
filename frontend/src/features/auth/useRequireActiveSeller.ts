"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import type { GateStatus } from "./useRequireAdmin";

// Client-side gate for /seller/*. Mirrors useRequireAdmin's shape but checks
// live seller capability off the session's `seller` field instead of a role
// — matches the backend's requireActiveSeller, which is also never role-based.
export function useRequireActiveSeller(): GateStatus {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const isActiveSeller = user?.seller?.status === "ACTIVE";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && !isActiveSeller) {
      router.replace("/account/selling");
    }
  }, [status, isActiveSeller, router]);

  if (status === "authenticated" && isActiveSeller) return "authorized";
  if (status === "unauthenticated" || (status === "authenticated" && !isActiveSeller)) return "unauthorized";
  return "loading";
}

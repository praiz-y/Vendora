"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

// Client-side gate for /account/*. This is a UX convenience, not the real
// security boundary — the backend independently rejects any unauthenticated
// or unauthorized request regardless of what this hook does.
export function useRequireAuth() {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return status;
}

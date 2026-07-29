"use client";

import { useEffect, useRef } from "react";
import { refreshAccessToken } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";

// On every full page load the access token is gone (it's memory-only — see
// authStore.ts), so this silently exchanges the HttpOnly refresh cookie for a
// fresh one via POST /auth/refresh before the rest of the app renders any
// auth-dependent UI. If there's no valid cookie, this just resolves to
// "unauthenticated" — a normal, expected outcome for a first-time visitor.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const clearSession = useAuthStore((state) => state.clearSession);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    refreshAccessToken().then((token) => {
      if (!token) clearSession();
    });
  }, [clearSession]);

  return <>{children}</>;
}

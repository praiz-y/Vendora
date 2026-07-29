import { create } from "zustand";
import type { SafeUser } from "@/types/user";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: SafeUser | null;
  accessToken: string | null;
  setSession: (user: SafeUser, accessToken: string) => void;
  updateUser: (user: SafeUser) => void;
  clearSession: () => void;
}

// Deliberately in-memory only (no persist middleware / localStorage) — the
// access token must not survive in JS-readable storage. On a full page
// reload it starts as null again; the AuthProvider silently re-derives a new
// one from the HttpOnly refresh cookie via POST /auth/refresh.
export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ status: "authenticated", user, accessToken }),
  updateUser: (user) => set({ user }),
  clearSession: () => set({ status: "unauthenticated", user: null, accessToken: null }),
}));

// Non-hook accessor so the plain (non-React) API client can read the current
// token without needing to be a component.
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

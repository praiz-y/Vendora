import { env } from "@/config/env";
import { getAccessToken, useAuthStore } from "@/stores/authStore";
import type { SafeUser } from "@/types/user";
import { ApiError } from "./ApiError";
import type { ApiResponse } from "./types";

interface SessionResponse {
  user: SafeUser;
  accessToken: string;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Internal — prevents the refresh-and-retry dance from looping. */
  skipAuthRefresh?: boolean;
}

// Concurrent 401s (e.g. several queries firing at once right as the access
// token expires) must trigger exactly one refresh call, not one per request
// — every caller awaits the same in-flight promise instead of racing.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${env.apiUrl}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        const json = (await res.json().catch(() => null)) as ApiResponse<SessionResponse> | null;

        if (!res.ok || !json || json.success === false) {
          useAuthStore.getState().clearSession();
          return null;
        }

        useAuthStore.getState().setSession(json.data.user, json.data.accessToken);
        return json.data.accessToken;
      } catch {
        useAuthStore.getState().clearSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, skipAuthRefresh, ...rest } = options;
  const token = getAccessToken();

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !json || json.success === false) {
    // Always worth a silent refresh-and-retry on a 401, even with no token
    // attached — not just "token expired mid-session". On a hard page load
    // (bookmark, refresh), a query can fire before AuthProvider's own
    // bootstrap refresh resolves; that request has no token yet but would
    // succeed once the refresh cookie is exchanged a moment later. Skipping
    // the retry here left pages like /orders permanently stuck on
    // "Authentication required" despite a perfectly valid session — found
    // via real-browser testing (Phase 8), not by exercising each origin's
    // requests in isolation. A truly logged-out user still ends up with the
    // same final error, just after one extra (cheap, deduped) refresh
    // attempt that resolves to null.
    if (response.status === 401 && !skipAuthRefresh) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return request<T>(path, { ...options, skipAuthRefresh: true });
      }
    }

    const message = json?.success === false ? json.message : `Request failed with status ${response.status}`;
    const code = json?.success === false ? json.error.code : "UNKNOWN_ERROR";
    const details = json?.success === false ? json.error.details : undefined;
    throw new ApiError(response.status, code, message, details);
  }

  return json.data;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
};

// Exposed so the AuthProvider can trigger the initial silent-refresh
// bootstrap on app load using the exact same dedup/refresh logic.
export { refreshAccessToken };

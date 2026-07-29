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
    // Only worth a silent refresh-and-retry if this request actually carried
    // an access token that could plausibly have just expired. A 401 with no
    // token attached (e.g. a failed login/register) is a real, final error.
    if (response.status === 401 && token && !skipAuthRefresh) {
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

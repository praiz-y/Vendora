"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/lib/api/ApiError";

// The live demo's API runs on a free host that sleeps when idle and takes up
// to ~a minute to wake. While it does, requests fail with 5xx/gateway errors
// or never connect — so those are retried with backoff long enough to ride
// out a cold start (1+2+4+8+15+15+15s ≈ 60s). 4xx errors are real answers
// (validation, auth, not found) and fail immediately as before.
const MAX_TRANSIENT_RETRIES = 7;

function isTransient(error: unknown): boolean {
  return !(error instanceof ApiError) || error.statusCode >= 500;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error) => isTransient(error) && failureCount < MAX_TRANSIENT_RETRIES,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

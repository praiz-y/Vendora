"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { entitlementsApi } from "./api";

export function useMyEntitlements() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["entitlements"],
    queryFn: () => entitlementsApi.list(),
    select: (data) => data.entitlements,
    enabled: status === "authenticated",
  });
}

// Download is a mutation (not a query) — it's triggered by a click, not
// rendered proactively, and each call re-verifies entitlement + resolves
// whatever is currently the latest version server-side.
export function useRequestDownload() {
  return useMutation({
    mutationFn: (productId: string) => entitlementsApi.getDownload(productId),
  });
}

"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVisitorId } from "@/lib/visitorId";
import { marketplaceApi, type ListMarketplaceProductsParams } from "./api";

export function useMarketplaceProducts(params: ListMarketplaceProductsParams) {
  return useQuery({
    queryKey: ["marketplace", "products", params],
    queryFn: () => marketplaceApi.listProducts(params),
  });
}

export function useMarketplaceProduct(slug: string) {
  return useQuery({
    queryKey: ["marketplace", "products", "slug", slug],
    queryFn: () => marketplaceApi.getProductBySlug(slug),
    select: (data) => data.product,
    enabled: !!slug,
  });
}

export function useMarketplaceStore(slug: string) {
  return useQuery({
    queryKey: ["marketplace", "stores", slug],
    queryFn: () => marketplaceApi.getStoreBySlug(slug),
    select: (data) => data.store,
    enabled: !!slug,
  });
}

export function useFeaturedStores(limit?: number) {
  return useQuery({
    queryKey: ["marketplace", "stores", "featured", limit],
    queryFn: () => marketplaceApi.listFeaturedStores(limit),
    select: (data) => data.stores,
  });
}

// Fire-and-forget, once per slug per mount — deliberately not a TanStack
// Query mutation/query (nothing renders off its result, and a query would
// re-fire on every refetch/refocus, inflating the view count it's supposed
// to measure).
export function useRecordProductView(slug: string | undefined) {
  const recorded = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!slug || recorded.current === slug) return;
    recorded.current = slug;
    marketplaceApi.recordView(slug, getVisitorId()).catch(() => {
      // Best-effort analytics — a failed view record should never surface
      // as a user-facing error.
    });
  }, [slug]);
}

"use client";

import { useQuery } from "@tanstack/react-query";
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

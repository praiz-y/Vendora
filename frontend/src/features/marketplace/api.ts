import { apiClient } from "@/lib/api/client";
import type { PublicProduct, PublicStore, ProductType } from "@/types/product";
import type { PaginationMeta } from "@/types/store";

export interface ListMarketplaceProductsParams {
  search?: string;
  categorySlug?: string;
  storeSlug?: string;
  type?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListMarketplaceProductsParams): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categorySlug) query.set("categorySlug", params.categorySlug);
  if (params.storeSlug) query.set("storeSlug", params.storeSlug);
  if (params.type) query.set("type", params.type);
  if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const marketplaceApi = {
  listProducts: (params: ListMarketplaceProductsParams = {}) =>
    apiClient.get<{ products: PublicProduct[]; meta: PaginationMeta }>(`/api/v1/marketplace/products${buildQueryString(params)}`),
  getProductBySlug: (slug: string) => apiClient.get<{ product: PublicProduct }>(`/api/v1/marketplace/products/${slug}`),
  getStoreBySlug: (slug: string) => apiClient.get<{ store: PublicStore }>(`/api/v1/marketplace/stores/${slug}`),
  recordView: (slug: string, visitorId: string) =>
    apiClient.post<Record<string, never>>(`/api/v1/marketplace/products/${slug}/view`, { visitorId }),
};

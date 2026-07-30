import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { Product, ProductStatus, ShippingType } from "@/types/product";

export interface ProductImageInput {
  url: string;
  isPrimary?: boolean;
}

export interface DigitalFileInput {
  fileKey: string;
  fileType: string;
  fileSize: number;
}

export type CreateProductInput =
  | {
      type: "PHYSICAL";
      name: string;
      description: string;
      categoryId: string;
      price: number;
      stockQuantity: number;
      shippingType: ShippingType;
      shippingFee?: number;
      images?: ProductImageInput[];
    }
  | {
      type: "DIGITAL";
      name: string;
      description: string;
      categoryId: string;
      price: number;
      file: DigitalFileInput;
      images?: ProductImageInput[];
    };

export interface UpdateProductInput {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  stockQuantity?: number;
  shippingType?: ShippingType;
  shippingFee?: number;
  images?: ProductImageInput[];
}

export interface ListMyProductsParams {
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListMyProductsParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const productsApi = {
  create: (input: CreateProductInput) => apiClient.post<{ product: Product }>("/api/v1/products", input),
  listMine: (params: ListMyProductsParams = {}) =>
    apiClient.get<{ products: Product[]; meta: PaginationMeta }>(`/api/v1/products/me${buildQueryString(params)}`),
  getMine: (id: string) => apiClient.get<{ product: Product }>(`/api/v1/products/me/${id}`),
  updateMine: (id: string, input: UpdateProductInput) =>
    apiClient.patch<{ product: Product }>(`/api/v1/products/me/${id}`, input),
  submit: (id: string) => apiClient.post<{ product: Product }>(`/api/v1/products/me/${id}/submit`),
  archive: (id: string) => apiClient.post<{ product: Product }>(`/api/v1/products/me/${id}/archive`),
};

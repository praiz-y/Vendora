import { apiClient } from "@/lib/api/client";
import type { Category, CategoryStatus } from "@/types/product";
import type { PaginationMeta } from "@/types/store";

export interface CreateCategoryInput {
  name: string;
  description?: string;
}
export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface AdminCategoriesListParams {
  status?: CategoryStatus;
  page?: number;
  limit?: number;
}

function buildQueryString(params: AdminCategoriesListParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const adminCategoriesApi = {
  list: (params: AdminCategoriesListParams = {}) =>
    apiClient.get<{ categories: Category[]; meta: PaginationMeta }>(`/api/v1/admin/categories${buildQueryString(params)}`),
  create: (input: CreateCategoryInput) => apiClient.post<{ category: Category }>("/api/v1/admin/categories", input),
  update: (id: string, input: UpdateCategoryInput) =>
    apiClient.patch<{ category: Category }>(`/api/v1/admin/categories/${id}`, input),
  archive: (id: string, reason: string) =>
    apiClient.post<{ category: Category }>(`/api/v1/admin/categories/${id}/archive`, { reason }),
  activate: (id: string) => apiClient.post<{ category: Category }>(`/api/v1/admin/categories/${id}/activate`),
};

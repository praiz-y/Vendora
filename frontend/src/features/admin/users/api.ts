import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { SafeUser, UserRole, UserStatus } from "@/types/user";

export interface AdminUsersListParams {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(params: AdminUsersListParams): string {
  const query = new URLSearchParams();
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const adminUsersApi = {
  list: (params: AdminUsersListParams = {}) =>
    apiClient.get<{ users: SafeUser[]; meta: PaginationMeta }>(`/api/v1/admin/users${buildQueryString(params)}`),
  getById: (id: string) => apiClient.get<{ user: SafeUser }>(`/api/v1/admin/users/${id}`),
  suspend: (id: string) => apiClient.post<{ user: SafeUser }>(`/api/v1/admin/users/${id}/suspend`),
  reactivate: (id: string) => apiClient.post<{ user: SafeUser }>(`/api/v1/admin/users/${id}/reactivate`),
  suspendStore: (id: string) => apiClient.post<{ user: SafeUser }>(`/api/v1/admin/users/${id}/store/suspend`),
  reactivateStore: (id: string) => apiClient.post<{ user: SafeUser }>(`/api/v1/admin/users/${id}/store/reactivate`),
};

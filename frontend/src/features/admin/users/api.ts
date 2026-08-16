import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { AdminSafeUser, UserRole, UserStatus } from "@/types/user";

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
    apiClient.get<{ users: AdminSafeUser[]; meta: PaginationMeta }>(`/api/v1/admin/users${buildQueryString(params)}`),
  getById: (id: string) => apiClient.get<{ user: AdminSafeUser }>(`/api/v1/admin/users/${id}`),
  suspend: (id: string, reason: string) =>
    apiClient.post<{ user: AdminSafeUser }>(`/api/v1/admin/users/${id}/suspend`, { reason }),
  reactivate: (id: string) => apiClient.post<{ user: AdminSafeUser }>(`/api/v1/admin/users/${id}/reactivate`),
  suspendStore: (id: string, reason: string) =>
    apiClient.post<{ user: AdminSafeUser }>(`/api/v1/admin/users/${id}/store/suspend`, { reason }),
  reactivateStore: (id: string) => apiClient.post<{ user: AdminSafeUser }>(`/api/v1/admin/users/${id}/store/reactivate`),
  featureStore: (id: string) => apiClient.post<{ user: AdminSafeUser }>(`/api/v1/admin/users/${id}/store/feature`),
  unfeatureStore: (id: string) => apiClient.post<{ user: AdminSafeUser }>(`/api/v1/admin/users/${id}/store/unfeature`),
};

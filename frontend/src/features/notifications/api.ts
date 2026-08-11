import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { Notification } from "@/types/notification";

export interface ListNotificationsParams {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListNotificationsParams): string {
  const query = new URLSearchParams();
  if (params.unreadOnly) query.set("unreadOnly", "true");
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const notificationsApi = {
  list: (params: ListNotificationsParams = {}) =>
    apiClient.get<{ notifications: Notification[]; meta: PaginationMeta; unreadCount: number }>(
      `/api/v1/notifications${buildQueryString(params)}`
    ),
  markAsRead: (id: string) => apiClient.post<{ notification: Notification }>(`/api/v1/notifications/${id}/read`),
  markAllAsRead: () => apiClient.post<Record<string, never>>("/api/v1/notifications/read-all"),
};

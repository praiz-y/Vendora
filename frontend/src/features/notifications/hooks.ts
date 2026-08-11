"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { notificationsApi, type ListNotificationsParams } from "./api";

const KEY = ["notifications"];

// Light polling (no websockets in this project) keeps the unread badge
// reasonably fresh without the buyer/seller needing to manually refresh.
const POLL_INTERVAL_MS = 30_000;

export function useNotifications(params: ListNotificationsParams = {}) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => notificationsApi.list(params),
    enabled: status === "authenticated",
    refetchInterval: POLL_INTERVAL_MS,
  });
}

// Backs the /notifications page's "Load more" pagination — TanStack's own
// page-accumulation (data.pages) replaces what would otherwise be manual
// local state kept in sync via an effect (an anti-pattern this project's
// lint config flags: see react-hooks/set-state-in-effect).
export function useInfiniteNotifications(params: { unreadOnly?: boolean; limit?: number } = {}) {
  const status = useAuthStore((s) => s.status);
  const limit = params.limit ?? 20;

  return useInfiniteQuery({
    queryKey: [...KEY, "infinite", params.unreadOnly ?? false, limit],
    queryFn: ({ pageParam }) => notificationsApi.list({ unreadOnly: params.unreadOnly, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.notifications.length, 0);
      return loaded < lastPage.meta.total ? allPages.length + 1 : undefined;
    },
    enabled: status === "authenticated",
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

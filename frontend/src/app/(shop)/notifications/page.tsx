"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import {
  useInfiniteNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/features/notifications/hooks";
import { resolveNotificationHref } from "@/features/notifications/routing";
import { notificationVisuals } from "@/features/notifications/visuals";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { Notification } from "@/types/notification";

const PAGE_SIZE = 20;

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationRow({
  notification,
  onSelect,
}: {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}) {
  const { Icon, bg, fg } = notificationVisuals[notification.type];

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={`flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left last:border-b-0 hover:bg-surface-alt ${
        notification.isRead ? "opacity-60" : ""
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg} ${fg}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-heading">{notification.title}</span>
          {!notification.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
        </span>
        <span className="text-sm text-muted">{notification.message}</span>
        <span className="text-xs text-light">{timeAgo(notification.createdAt)}</span>
      </span>
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const authStatus = useRequireAuth();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unreadOnly = filter === "unread";
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotifications({ unreadOnly, limit: PAGE_SIZE });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  if (authStatus !== "authenticated") {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-muted">Loading…</div>;
  }

  function handleSelect(notification: Notification) {
    if (!notification.isRead) markAsRead.mutate(notification.id);
    const href = resolveNotificationHref(notification);
    if (href) router.push(href);
  }

  const items = data?.pages.flatMap((p) => p.notifications) ?? [];
  const unreadCount = data?.pages[0]?.unreadCount ?? 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-heading">Notifications</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead.mutate()}
            className="text-sm text-muted underline hover:text-heading"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-border">
        {(["all", "unread"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`border-b-2 px-1 pb-2 text-sm font-medium capitalize ${
              filter === tab ? "border-primary text-heading" : "border-transparent text-muted hover:text-heading"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted">
          {filter === "unread" ? "You're all caught up." : "No notifications yet."}
        </p>
      )}

      {items.length > 0 && (
        <div className="rounded-md border border-border bg-surface">
          {items.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} onSelect={handleSelect} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <Button
          variant="secondary"
          onClick={() => fetchNextPage()}
          loading={isFetchingNextPage}
          className="self-center"
        >
          Load more
        </Button>
      )}
    </div>
  );
}

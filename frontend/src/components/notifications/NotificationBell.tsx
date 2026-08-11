"use client";

import Link from "next/link";
import { BellIcon } from "@/components/icons";
import { useNotifications } from "@/features/notifications/hooks";

// Simplified from a dropdown panel to a link+badge — Part 4 of the overhaul
// plan moved the panel's job to a dedicated /notifications page (real
// pagination, click-through routing, filters) now that this no longer has a
// natural home as a floating panel.
export function NotificationBell() {
  const { data } = useNotifications({ limit: 1 });
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Link href="/notifications" aria-label="Notifications" className="relative text-body hover:text-primary">
      <BellIcon className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

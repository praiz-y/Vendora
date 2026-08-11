"use client";

import Link from "next/link";
import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminUsers } from "@/features/admin/users/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { UserStatus } from "@/types/user";

const statusTabs: { label: string; value: UserStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

export default function AdminUsersPage() {
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useAdminUsers({ status, search: search || undefined });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="mt-1 text-sm text-foreground/60">View accounts and manage account/store status.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setStatus(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                status === tab.value
                  ? "bg-foreground text-background"
                  : "border border-black/15 text-foreground/70 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Search users by name, username, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, username, or email…"
          className="min-w-[220px] rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:focus:ring-white/30"
        />
      </div>

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-3">
        {data?.users.map((user) => (
          <Link
            key={user.id}
            href={`/admin/users/${user.id}`}
            className="flex items-center justify-between rounded-md border border-black/10 p-4 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium">
                {user.firstName} {user.lastName} <span className="text-foreground/50">@{user.username}</span>
              </p>
              <p className="text-sm text-foreground/60">
                {user.email} · {user.role}
                {user.seller && ` · seller (${user.seller.status})`}
              </p>
            </div>
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                user.status === "ACTIVE"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {user.status}
            </span>
          </Link>
        ))}
        {data?.users.length === 0 && <p className="text-sm text-foreground/60">No users match this filter.</p>}
      </div>
    </div>
  );
}

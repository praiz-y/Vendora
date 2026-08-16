"use client";

import { Suspense, useEffect, useState } from "react";
import { AdminMasterDetail } from "@/components/admin/AdminMasterDetail";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminUsers } from "@/features/admin/users/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { useAdminDetailSelection } from "@/lib/useAdminDetailSelection";
import { useAdminUrlFilters } from "@/lib/useAdminUrlFilters";
import type { UserStatus } from "@/types/user";
import { UserDetail } from "./_components/UserDetail";

const statusTabs: { label: string; value: UserStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

const statusVariant: Record<UserStatus, BadgeVariant> = {
  ACTIVE: "success",
  SUSPENDED: "error",
};

function UsersList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { get, set } = useAdminUrlFilters();
  const status = (get("status") || undefined) as UserStatus | undefined;
  const page = Number(get("page", "1"));
  const urlSearch = get("search", "") ?? "";
  const [search, setSearch] = useState(urlSearch);
  const { data, isLoading, isError, error } = useAdminUsers({ status, search: search || undefined, page, limit: 20 });

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== urlSearch) set({ search: search || undefined, page: undefined });
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleStatusChange(next: UserStatus | undefined) {
    set({ status: next, page: undefined });
  }

  function handlePageChange(next: number) {
    set({ page: String(next) });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Users</h2>
        <p className="mt-1 text-sm text-muted">View accounts and manage account/store status.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => handleStatusChange(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                status === tab.value ? "bg-primary-hover text-white" : "border border-border-admin text-body transition-colors hover:bg-surface-alt"
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
          className="min-w-55 rounded-md border border-border-admin bg-transparent px-3 py-1.5 text-sm text-body outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-3">
        {data?.users.map((user) => (
          <button
            key={user.id}
            onClick={() => onSelect(user.id)}
            className={`flex items-center justify-between rounded-md border p-4 text-left transition-colors hover:bg-surface-alt ${
              selectedId === user.id ? "border-primary" : "border-border-admin"
            }`}
          >
            <div>
              <p className="text-sm font-medium text-heading">
                {user.firstName} {user.lastName} <span className="text-muted">@{user.username}</span>
              </p>
              <p className="text-sm text-muted">
                {user.email} · {user.role}
                {user.seller && ` · seller (${user.seller.status})`}
                {user.seller?.isFeatured && " · featured"}
              </p>
            </div>
            <Badge variant={statusVariant[user.status]}>{user.status}</Badge>
          </button>
        ))}
        {data?.users.length === 0 && <p className="text-sm text-muted">No users match this filter.</p>}
      </div>

      <AdminPagination meta={data?.meta} page={page} onPageChange={handlePageChange} />
    </div>
  );
}

function AdminUsersContent() {
  const { selectedId, select, clear } = useAdminDetailSelection();

  return (
    <AdminMasterDetail
      list={<UsersList selectedId={selectedId} onSelect={select} />}
      detail={selectedId ? <UserDetail id={selectedId} /> : null}
      detailKey={selectedId}
      onCloseDetail={clear}
    />
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted">Loading…</p>}>
      <AdminUsersContent />
    </Suspense>
  );
}

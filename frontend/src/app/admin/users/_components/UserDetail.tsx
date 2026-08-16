"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailRow } from "@/components/admin/DetailRow";
import { FormMessage } from "@/components/ui/FormMessage";
import { Textarea } from "@/components/ui/Textarea";
import {
  useAdminUser,
  useFeatureUserStore,
  useReactivateUser,
  useReactivateUserStore,
  useSuspendUser,
  useSuspendUserStore,
  useUnfeatureUserStore,
} from "@/features/admin/users/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { StoreStatus, UserStatus } from "@/types/user";

const statusVariant: Record<UserStatus, BadgeVariant> = {
  ACTIVE: "success",
  SUSPENDED: "error",
};

const storeStatusVariant: Record<StoreStatus, BadgeVariant> = {
  ACTIVE: "success",
  SUSPENDED: "error",
  CLOSED: "neutral",
};

// Shared by the standalone /admin/users/[id] route (a direct-link fallback,
// full page, no master list) and the list page's inline master-detail panel
// (Overhaul Phase 10) — same component either way.
export function UserDetail({ id }: { id: string }) {
  const { data: user, isLoading, isError, error } = useAdminUser(id);
  const suspendUser = useSuspendUser();
  const reactivateUser = useReactivateUser();
  const suspendStore = useSuspendUserStore();
  const reactivateStore = useReactivateUserStore();
  const featureStore = useFeatureUserStore();
  const unfeatureStore = useUnfeatureUserStore();

  const [accountReason, setAccountReason] = useState("");
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [storeReason, setStoreReason] = useState("");
  const [showStoreForm, setShowStoreForm] = useState(false);

  function handleSuspendAccount(e: FormEvent) {
    e.preventDefault();
    suspendUser.mutate(
      { id, reason: accountReason },
      { onSuccess: () => setShowAccountForm(false) }
    );
  }

  function handleSuspendStore(e: FormEvent) {
    e.preventDefault();
    suspendStore.mutate(
      { id, reason: storeReason },
      { onSuccess: () => setShowStoreForm(false) }
    );
  }

  if (isLoading) return <p className="py-6 text-sm text-muted">Loading…</p>;
  if (isError || !user) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const anyError =
    suspendUser.error ??
    reactivateUser.error ??
    suspendStore.error ??
    reactivateStore.error ??
    featureStore.error ??
    unfeatureStore.error;
  const anyPending =
    suspendUser.isPending ||
    reactivateUser.isPending ||
    suspendStore.isPending ||
    reactivateStore.isPending ||
    featureStore.isPending ||
    unfeatureStore.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">
          {user.firstName} {user.lastName}
        </h2>
        <p className="text-sm text-muted">@{user.username}</p>
        <div className="mt-1">
          <Badge variant={statusVariant[user.status]}>{user.status}</Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-md border border-border-admin p-4">
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Role" value={user.role} />
        <DetailRow label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
      </dl>

      {anyError && <FormMessage type="error">{getErrorMessage(anyError)}</FormMessage>}

      {user.role !== "ADMIN" && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-body">Account</h3>
          {user.status === "ACTIVE" ? (
            <div className="flex flex-col gap-3">
              <Button
                variant="danger"
                onClick={() => setShowAccountForm((v) => !v)}
                disabled={anyPending}
                className="self-start"
              >
                Suspend account
              </Button>
              {showAccountForm && (
                <form className="flex max-w-lg flex-col gap-3" onSubmit={handleSuspendAccount}>
                  <Textarea
                    label="Suspension reason"
                    name="accountReason"
                    required
                    minLength={3}
                    value={accountReason}
                    onChange={(e) => setAccountReason(e.target.value)}
                  />
                  <Button type="submit" variant="danger" loading={suspendUser.isPending} className="self-start">
                    Confirm suspension
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <Button
              variant="brand"
              onClick={() => reactivateUser.mutate(id)}
              loading={reactivateUser.isPending}
              disabled={anyPending}
              className="self-start"
            >
              Reactivate account
            </Button>
          )}
        </div>
      )}

      {user.seller && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-body">Store: {user.seller.storeName}</h3>
            <Badge variant={storeStatusVariant[user.seller.status]}>{user.seller.status}</Badge>
            {user.seller.isFeatured && <Badge variant="info">Featured</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/stores/${user.seller.storeSlug}`} className="text-sm text-muted hover:underline">
              View store
            </Link>

            {user.seller.status === "SUSPENDED" ? (
              <Button variant="brand" onClick={() => reactivateStore.mutate(id)} loading={reactivateStore.isPending} disabled={anyPending}>
                Reactivate store
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => setShowStoreForm((v) => !v)}
                disabled={anyPending || user.seller.status === "CLOSED"}
              >
                Suspend store
              </Button>
            )}

            {user.seller.isFeatured ? (
              <Button
                variant="secondary"
                onClick={() => unfeatureStore.mutate(id)}
                loading={unfeatureStore.isPending}
                disabled={anyPending}
              >
                Unfeature store
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => featureStore.mutate(id)}
                loading={featureStore.isPending}
                disabled={anyPending || user.seller.status !== "ACTIVE"}
              >
                Feature store
              </Button>
            )}
          </div>

          {showStoreForm && (
            <form className="flex max-w-lg flex-col gap-3" onSubmit={handleSuspendStore}>
              <Textarea
                label="Suspension reason"
                name="storeReason"
                required
                minLength={3}
                value={storeReason}
                onChange={(e) => setStoreReason(e.target.value)}
              />
              <Button type="submit" variant="danger" loading={suspendStore.isPending} className="self-start">
                Confirm suspension
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

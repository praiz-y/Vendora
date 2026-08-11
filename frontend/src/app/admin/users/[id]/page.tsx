"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import {
  useAdminUser,
  useReactivateUser,
  useReactivateUserStore,
  useSuspendUser,
  useSuspendUserStore,
} from "@/features/admin/users/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: user, isLoading, isError, error } = useAdminUser(id);
  const suspendUser = useSuspendUser();
  const reactivateUser = useReactivateUser();
  const suspendStore = useSuspendUserStore();
  const reactivateStore = useReactivateUserStore();

  if (isLoading) return <p className="py-6 text-sm text-foreground/60">Loading…</p>;
  if (isError || !user) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const anyError =
    suspendUser.error ?? reactivateUser.error ?? suspendStore.error ?? reactivateStore.error;
  const anyPending = suspendUser.isPending || reactivateUser.isPending || suspendStore.isPending || reactivateStore.isPending;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <Link href="/admin/users" className="text-sm text-foreground/60 hover:underline">
          ← Back to users
        </Link>
        <h2 className="mt-2 text-lg font-semibold">
          {user.firstName} {user.lastName}
        </h2>
        <p className="text-sm text-foreground/60">@{user.username}</p>
      </div>

      <dl className="grid max-w-lg grid-cols-2 gap-4 rounded-md border border-black/10 p-4 dark:border-white/10">
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Role" value={user.role} />
        <DetailRow label="Account status" value={user.status} />
        <DetailRow label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
      </dl>

      {anyError && <FormMessage type="error">{getErrorMessage(anyError)}</FormMessage>}

      {user.role !== "ADMIN" && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground/70">Account</h3>
          <div className="flex gap-3">
            {user.status === "ACTIVE" ? (
              <Button variant="danger" onClick={() => suspendUser.mutate(id)} loading={suspendUser.isPending} disabled={anyPending}>
                Suspend account
              </Button>
            ) : (
              <Button onClick={() => reactivateUser.mutate(id)} loading={reactivateUser.isPending} disabled={anyPending}>
                Reactivate account
              </Button>
            )}
          </div>
        </div>
      )}

      {user.seller && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground/70">
            Store: {user.seller.storeName} ({user.seller.status})
          </h3>
          <div className="flex gap-3">
            <Link href={`/stores/${user.seller.storeSlug}`} className="text-sm text-foreground/60 hover:underline self-center">
              View store
            </Link>
            {user.seller.status === "SUSPENDED" ? (
              <Button onClick={() => reactivateStore.mutate(id)} loading={reactivateStore.isPending} disabled={anyPending}>
                Reactivate store
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => suspendStore.mutate(id)}
                loading={suspendStore.isPending}
                disabled={anyPending || user.seller.status === "CLOSED"}
              >
                Suspend store
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminOverview } from "@/features/adminDashboard/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function PendingActionRow({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border border-black/10 p-3 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
    >
      <span>{label}</span>
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${count > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-black/10 text-foreground/50 dark:bg-white/10"}`}>
        {count}
      </span>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const { data: overview, isLoading, isError, error } = useAdminOverview();

  if (isLoading) return <p className="py-6 text-sm text-foreground/60">Loading…</p>;
  if (isError || !overview) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="mt-1 text-sm text-foreground/60">A platform-wide snapshot of Vendora.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Users" value={overview.users.total} />
        <StatCard label="Active Stores" value={overview.stores.active} />
        <StatCard label="Orders" value={overview.orders.total} />
        <StatCard label="Revenue" value={formatNaira(overview.totalRevenue)} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground/70">Needs your attention</h3>
        <div className="flex flex-col gap-2">
          <PendingActionRow
            label="Pending seller applications"
            count={overview.pendingActions.sellerApplications}
            href="/admin/seller-applications"
          />
          <PendingActionRow label="Products pending review" count={overview.pendingActions.products} href="/admin/products" />
          <PendingActionRow
            label="Product reports pending review"
            count={overview.pendingActions.productReports}
            href="/admin/product-reports"
          />
          <PendingActionRow label="Refund requests pending review" count={overview.pendingActions.refunds} href="/admin/refunds" />
        </div>
      </div>

      {overview.users.suspended > 0 && (
        <p className="text-sm text-foreground/60">
          {overview.users.suspended} suspended user{overview.users.suspended === 1 ? "" : "s"} —{" "}
          <Link href="/admin/users" className="underline">
            view
          </Link>
        </p>
      )}
    </div>
  );
}

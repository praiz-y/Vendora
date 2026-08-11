"use client";

import Link from "next/link";
import { FormMessage } from "@/components/ui/FormMessage";
import { useSellerOverview } from "@/features/sellerDashboard/hooks";
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

const sellerOrderStatusLabel: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function SellerDashboardPage() {
  const { data: overview, isLoading, isError, error } = useSellerOverview();

  if (isLoading) return <p className="py-6 text-sm text-foreground/60">Loading…</p>;
  if (isError || !overview) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="mt-1 text-sm text-foreground/60">An overview of your store&apos;s activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Products" value={overview.products.total} />
        <StatCard label="Orders" value={overview.orders.total} />
        <StatCard label="Revenue" value={formatNaira(overview.totalRevenue)} />
        <StatCard
          label="Rating"
          value={overview.rating.averageRating !== null ? `★ ${overview.rating.averageRating.toFixed(1)}` : "—"}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground/70">Orders by status</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(overview.orders.byStatus).map(([status, count]) => (
            <span
              key={status}
              className="rounded-md border border-black/10 px-3 py-1.5 text-sm dark:border-white/10"
            >
              {sellerOrderStatusLabel[status] ?? status}: <span className="font-medium">{count}</span>
            </span>
          ))}
          {Object.keys(overview.orders.byStatus).length === 0 && (
            <p className="text-sm text-foreground/50">No orders yet.</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground/70">Recent orders</h3>
        <div className="flex flex-col gap-2">
          {overview.recentOrders.map((sellerOrder) => (
            <Link
              key={sellerOrder.id}
              href={`/seller/orders/${sellerOrder.id}`}
              className="flex items-center justify-between rounded-md border border-black/10 p-3 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
            >
              <span>
                {sellerOrder.order.buyer.firstName} {sellerOrder.order.buyer.lastName} ·{" "}
                {new Date(sellerOrder.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-foreground/60">{sellerOrderStatusLabel[sellerOrder.status] ?? sellerOrder.status}</span>
                <span className="font-medium">{formatNaira(sellerOrder.total)}</span>
              </span>
            </Link>
          ))}
          {overview.recentOrders.length === 0 && <p className="text-sm text-foreground/50">No orders yet.</p>}
        </div>
      </div>
    </div>
  );
}

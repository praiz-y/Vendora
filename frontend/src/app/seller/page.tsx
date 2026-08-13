"use client";

import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useSellerOverview } from "@/features/sellerDashboard/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { SellerOrderStatus } from "@/types/order";

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-heading">{value}</p>
    </div>
  );
}

const sellerOrderStatusLabel: Record<SellerOrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const sellerOrderStatusVariant: Record<SellerOrderStatus, BadgeVariant> = {
  PENDING: "warning",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "neutral",
};

export default function SellerDashboardPage() {
  const { data: overview, isLoading, isError, error } = useSellerOverview();

  if (isLoading) return <p className="py-6 text-sm text-muted">Loading…</p>;
  if (isError || !overview) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  // First-time empty state: a brand-new store with zero products shows a
  // welcome callout instead of a wall of zero-valued stat cards.
  if (overview.products.total === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-6">
        <div>
          <h2 className="text-lg font-semibold text-heading">Welcome to your store</h2>
          <p className="mt-1 max-w-md text-sm text-muted">
            You haven&apos;t listed any products yet. Add your first product to start selling on Vendora.
          </p>
        </div>
        <Link href="/seller/products/new">
          <Button>Add your first product</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Dashboard</h2>
        <p className="mt-1 text-sm text-muted">An overview of your store&apos;s activity.</p>
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
        <h3 className="mb-3 text-sm font-semibold text-body">Orders by status</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(overview.orders.byStatus).map(([status, count]) => (
            <Link
              key={status}
              href={`/seller/orders?status=${status}`}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-alt"
            >
              <Badge variant={sellerOrderStatusVariant[status as SellerOrderStatus]}>
                {sellerOrderStatusLabel[status as SellerOrderStatus] ?? status}
              </Badge>
              <span className="font-medium text-heading">{count}</span>
            </Link>
          ))}
          {Object.keys(overview.orders.byStatus).length === 0 && <p className="text-sm text-light">No orders yet.</p>}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-body">Recent orders</h3>
        <div className="flex flex-col gap-2">
          {overview.recentOrders.map((sellerOrder) => (
            <Link
              key={sellerOrder.id}
              href={`/seller/orders/${sellerOrder.id}`}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-surface-alt"
            >
              <span className="text-body">
                {sellerOrder.order.buyer.firstName} {sellerOrder.order.buyer.lastName} ·{" "}
                {new Date(sellerOrder.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-3">
                <Badge variant={sellerOrderStatusVariant[sellerOrder.status]}>
                  {sellerOrderStatusLabel[sellerOrder.status] ?? sellerOrder.status}
                </Badge>
                <span className="font-medium text-heading">{formatNaira(sellerOrder.total)}</span>
              </span>
            </Link>
          ))}
          {overview.recentOrders.length === 0 && <p className="text-sm text-light">No orders yet.</p>}
        </div>
      </div>
    </div>
  );
}

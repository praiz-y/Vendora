"use client";

import Link from "next/link";
import { ChevronDownIcon } from "@/components/icons";
import { RevenueTrendChart } from "@/components/seller/RevenueTrendChart";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useSellerAnalytics } from "@/features/sellerDashboard/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-heading">{value}</p>
    </div>
  );
}

// Purely cosmetic — an affordance suggesting the columns sort, matching
// this phase's "visual only, real wiring later" pattern (same call as the
// Profile/ProductFieldset dropzones). No click handler.
function SortableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 font-medium">
      <span className="flex items-center gap-1">
        {children}
        <ChevronDownIcon className="h-3 w-3 text-light" />
      </span>
    </th>
  );
}

export default function SellerAnalyticsPage() {
  const { data: analytics, isLoading, isError, error } = useSellerAnalytics();

  if (isLoading) return <p className="py-6 text-sm text-muted">Loading…</p>;
  if (isError || !analytics) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const hasAnyData = analytics.perProduct.length > 0;
  const hasRevenue = analytics.revenueTrend.some((point) => Number(point.revenue) > 0);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-start gap-4 py-6">
        <div>
          <h2 className="text-lg font-semibold text-heading">Analytics</h2>
          <p className="mt-1 max-w-md text-sm text-muted">
            Once you have products listed, views, sales, and revenue trends will show up here.
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
        <h2 className="text-lg font-semibold text-heading">Analytics</h2>
        <p className="mt-1 text-sm text-muted">Product views, sales, and revenue across your store.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Views" value={analytics.totals.views} />
        <StatCard label="Units Sold" value={analytics.totals.unitsSold} />
        <StatCard label="Revenue" value={formatNaira(analytics.totals.revenue)} />
      </div>

      <div className="rounded-md border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold text-body">Revenue — last 30 days</h3>
        {hasRevenue ? (
          <RevenueTrendChart data={analytics.revenueTrend} />
        ) : (
          <p className="py-8 text-center text-sm text-light">No data yet — revenue will chart here once you make a sale.</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr>
              <SortableHeader>Product</SortableHeader>
              <SortableHeader>Views</SortableHeader>
              <SortableHeader>Units Sold</SortableHeader>
              <SortableHeader>Revenue</SortableHeader>
            </tr>
          </thead>
          <tbody>
            {analytics.perProduct.map((entry) => (
              <tr key={entry.productId} className="border-b border-border/60 text-body last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/products/${entry.slug}`} className="text-heading hover:underline">
                    {entry.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{entry.views}</td>
                <td className="px-4 py-2">{entry.unitsSold}</td>
                <td className="px-4 py-2">{formatNaira(entry.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

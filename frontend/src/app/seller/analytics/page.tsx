"use client";

import Link from "next/link";
import { FormMessage } from "@/components/ui/FormMessage";
import { useSellerAnalytics } from "@/features/sellerDashboard/hooks";
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

export default function SellerAnalyticsPage() {
  const { data: analytics, isLoading, isError, error } = useSellerAnalytics();

  if (isLoading) return <p className="py-6 text-sm text-foreground/60">Loading…</p>;
  if (isError || !analytics) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Analytics</h2>
        <p className="mt-1 text-sm text-foreground/60">Product views, sales, and revenue across your store.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Views" value={analytics.totals.views} />
        <StatCard label="Units Sold" value={analytics.totals.unitsSold} />
        <StatCard label="Revenue" value={formatNaira(analytics.totals.revenue)} />
      </div>

      <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-foreground/50 dark:border-white/10">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Views</th>
              <th className="px-4 py-2 font-medium">Units Sold</th>
              <th className="px-4 py-2 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {analytics.perProduct.map((entry) => (
              <tr key={entry.productId} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-4 py-2">
                  <Link href={`/products/${entry.slug}`} className="hover:underline">
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
        {analytics.perProduct.length === 0 && (
          <p className="p-4 text-sm text-foreground/50">No products yet.</p>
        )}
      </div>
    </div>
  );
}

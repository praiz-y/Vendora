"use client";

import Link from "next/link";
import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useMySellerOrders } from "@/features/sellerOrders/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { SellerOrderStatus } from "@/types/order";

const statusTabs: { label: string; value: SellerOrderStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const statusBadgeClasses: Record<SellerOrderStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PROCESSING: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  SHIPPED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  DELIVERED: "bg-green-500/10 text-green-700 dark:text-green-400",
  CANCELLED: "bg-black/10 text-foreground/50 dark:bg-white/10",
};

export default function SellerOrdersPage() {
  const [status, setStatus] = useState<SellerOrderStatus | undefined>(undefined);
  const { data, isLoading, isError, error } = useMySellerOrders({ status });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Orders</h2>
        <p className="mt-1 text-sm text-foreground/60">Manage your portion of buyer orders.</p>
      </div>

      <div className="flex flex-wrap gap-2">
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

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {data?.sellerOrders.length === 0 && <p className="text-sm text-foreground/60">No orders in this category.</p>}

      <div className="flex flex-col gap-3">
        {data?.sellerOrders.map((sellerOrder) => (
          <Link
            key={sellerOrder.id}
            href={`/seller/orders/${sellerOrder.id}`}
            className="flex items-center justify-between rounded-md border border-black/10 p-4 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium">Order #{sellerOrder.id.slice(-8)}</p>
              <p className="text-sm text-foreground/60">
                {sellerOrder.order.buyer.firstName} {sellerOrder.order.buyer.lastName} ·{" "}
                {new Date(sellerOrder.createdAt).toLocaleDateString()} · {formatNaira(sellerOrder.total)}
              </p>
            </div>
            <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeClasses[sellerOrder.status]}`}>
              {sellerOrder.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

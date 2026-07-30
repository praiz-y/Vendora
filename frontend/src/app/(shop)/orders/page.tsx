"use client";

import Link from "next/link";
import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { useMyOrders } from "@/features/orders/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { OrderStatus } from "@/types/order";

const statusTabs: { label: string; value: OrderStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Awaiting Payment", value: "PENDING_PAYMENT" },
  { label: "Paid", value: "PAID" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const statusBadgeClasses: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PAID: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PARTIALLY_PROCESSING: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PARTIALLY_SHIPPED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PARTIALLY_DELIVERED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400",
  CANCELLED: "bg-black/10 text-foreground/50 dark:bg-white/10",
};

export default function OrdersPage() {
  const authStatus = useRequireAuth();
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const { data, isLoading, isError, error } = useMyOrders({ status });

  if (authStatus !== "authenticated") {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-foreground/60">Loading…</div>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Your Orders</h1>

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
      {data?.orders.length === 0 && <p className="text-sm text-foreground/60">No orders in this category.</p>}

      <div className="flex flex-col gap-3">
        {data?.orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex items-center justify-between rounded-md border border-black/10 p-4 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium">Order #{order.id.slice(-8)}</p>
              <p className="text-sm text-foreground/60">
                {new Date(order.placedAt).toLocaleDateString()} · {order.sellerOrders.length} seller
                {order.sellerOrders.length === 1 ? "" : "s"} · {formatNaira(order.totalAmount)}
              </p>
            </div>
            <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeClasses[order.status]}`}>
              {order.status.replace(/_/g, " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

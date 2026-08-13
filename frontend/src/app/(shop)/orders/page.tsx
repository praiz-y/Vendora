"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

const statusBadgeVariant: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: "warning",
  PAID: "info",
  PARTIALLY_PROCESSING: "info",
  PARTIALLY_SHIPPED: "info",
  PARTIALLY_DELIVERED: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

export default function OrdersPage() {
  const authStatus = useRequireAuth();
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const { data, isLoading, isError, error } = useMyOrders({ status });

  if (authStatus !== "authenticated") {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-heading">Your Orders</h1>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === tab.value
                ? "bg-primary text-white"
                : "border border-border text-body hover:bg-surface-alt"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {data?.orders.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted">No orders in this category.</p>
          <Link href="/products">
            <Button variant="secondary">Browse products</Button>
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data?.orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex items-center justify-between rounded-md border border-border p-4 hover:bg-surface-alt"
          >
            <div>
              <p className="text-sm font-medium text-heading">Order #{order.id.slice(-8)}</p>
              <p className="text-sm text-muted">
                {new Date(order.placedAt).toLocaleDateString()} · {order.sellerOrders.length} seller
                {order.sellerOrders.length === 1 ? "" : "s"} · {formatNaira(order.totalAmount)}
              </p>
            </div>
            <Badge variant={statusBadgeVariant[order.status]}>{order.status.replace(/_/g, " ")}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

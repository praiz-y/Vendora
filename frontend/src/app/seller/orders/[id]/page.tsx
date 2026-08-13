"use client";

import { use } from "react";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useMySellerOrder, useUpdateSellerOrderStatus } from "@/features/sellerOrders/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { SellerOrderStatus } from "@/types/order";

const statusVariant: Record<SellerOrderStatus, BadgeVariant> = {
  PENDING: "warning",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "neutral",
};

// Mirrors backend/src/modules/orders/seller/sellerOrders.service.ts's
// ALLOWED_TRANSITIONS — kept in sync by hand since it's a small, stable map.
const ALLOWED_TRANSITIONS: Record<SellerOrderStatus, SellerOrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: sellerOrder, isLoading, isError, error } = useMySellerOrder(id);
  const updateStatus = useUpdateSellerOrderStatus();

  if (isLoading) return <p className="py-6 text-sm text-muted">Loading…</p>;
  if (isError || !sellerOrder) return <FormMessage type="error">{getErrorMessage(error) || "Order not found."}</FormMessage>;

  const nextStatuses = ALLOWED_TRANSITIONS[sellerOrder.status];

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <Link href="/seller/orders" className="text-sm text-muted hover:underline">
          ← Back to orders
        </Link>
        <h2 className="mt-2 text-lg font-semibold text-heading">Order #{sellerOrder.id.slice(-8)}</h2>
        <p className="flex items-center gap-2 text-sm text-muted">
          Buyer: {sellerOrder.order.buyer.firstName} {sellerOrder.order.buyer.lastName} (@{sellerOrder.order.buyer.username}) ·
          <Badge variant={statusVariant[sellerOrder.status]}>{sellerOrder.status}</Badge>
        </p>
      </div>

      <div className="rounded-md border border-border p-4">
        <ul className="flex flex-col gap-2">
          {sellerOrder.items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm text-body">
              <span>
                {item.productNameSnapshot} × {item.quantity} ({item.productTypeSnapshot})
              </span>
              <span>{formatNaira(Number(item.priceSnapshot) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted">Shipping</span>
          <span className="text-body">{formatNaira(sellerOrder.shippingFee)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-heading">
          <span>Total</span>
          <span>{formatNaira(sellerOrder.total)}</span>
        </div>
      </div>

      {updateStatus.isError && <FormMessage type="error">{getErrorMessage(updateStatus.error)}</FormMessage>}

      {nextStatuses.length > 0 && (
        <div className="flex gap-3">
          {nextStatuses.map((next) => (
            <Button
              key={next}
              variant={next === "CANCELLED" ? "danger" : "primary"}
              onClick={() => updateStatus.mutate({ id: sellerOrder.id, status: next })}
              loading={updateStatus.isPending}
            >
              Mark as {next.charAt(0) + next.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

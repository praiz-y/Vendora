"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useRetryPayment } from "@/features/checkout/hooks";
import { useCancelOrder, useMyOrder } from "@/features/orders/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { SellerOrder } from "@/types/order";

const sellerOrderStatusLabel: Record<SellerOrder["status"], string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function SellerOrderCard({ sellerOrder }: { sellerOrder: SellerOrder }) {
  return (
    <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{sellerOrder.store.name}</h3>
        <span className="text-xs font-medium text-foreground/60">{sellerOrderStatusLabel[sellerOrder.status]}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {sellerOrder.items.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span>
              {item.productNameSnapshot} × {item.quantity}
            </span>
            <span>{formatNaira(Number(item.priceSnapshot) * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-sm dark:border-white/10">
        <span className="text-foreground/60">Shipping</span>
        <span>{formatNaira(sellerOrder.shippingFee)}</span>
      </div>
      <div className="flex justify-between text-sm font-medium">
        <span>Seller total</span>
        <span>{formatNaira(sellerOrder.total)}</span>
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isLoading, isError, error } = useMyOrder(id);
  const cancelOrder = useCancelOrder();
  const retryPayment = useRetryPayment();

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-foreground/60">Loading…</div>;
  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <FormMessage type="error">{getErrorMessage(error) || "Order not found."}</FormMessage>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/orders" className="text-sm text-foreground/60 hover:underline">
          ← Back to orders
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Order #{order.id.slice(-8)}</h1>
        <p className="text-sm text-foreground/60">
          Placed {new Date(order.placedAt).toLocaleString()} · Status: {order.status.replace(/_/g, " ")}
        </p>
      </div>

      {order.status === "PENDING_PAYMENT" && (
        <div className="flex flex-col gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm">This order is awaiting payment.</p>
          {retryPayment.isError && <FormMessage type="error">{getErrorMessage(retryPayment.error)}</FormMessage>}
          <div className="flex gap-3">
            <Button onClick={() => retryPayment.mutate({ orderId: order.id })} loading={retryPayment.isPending}>
              Retry payment
            </Button>
            <Button variant="danger" onClick={() => cancelOrder.mutate(order.id)} loading={cancelOrder.isPending}>
              Cancel order
            </Button>
          </div>
        </div>
      )}

      {order.shippingAddress && (
        <div className="rounded-md border border-black/10 p-4 text-sm dark:border-white/10">
          <h2 className="mb-1 font-semibold text-foreground/70">Shipping to</h2>
          <p>{order.shippingAddress.fullName}</p>
          <p>
            {order.shippingAddress.addressLine1}, {order.shippingAddress.city}, {order.shippingAddress.state}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {order.sellerOrders.map((sellerOrder) => (
          <SellerOrderCard key={sellerOrder.id} sellerOrder={sellerOrder} />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/10">
        <span className="text-sm text-foreground/60">Payment: {order.payment.status}</span>
        <span className="text-lg font-semibold">{formatNaira(order.totalAmount)}</span>
      </div>
    </div>
  );
}

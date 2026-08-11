"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useRetryPayment } from "@/features/checkout/hooks";
import { useCancelOrder, useMyOrder } from "@/features/orders/hooks";
import { useCreateReview } from "@/features/reviews/hooks";
import { useRequestRefund } from "@/features/refunds/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { OrderItem, OrderStatus, SellerOrder } from "@/types/order";

const sellerOrderStatusLabel: Record<SellerOrder["status"], string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

// Reviewable only once its SellerOrder has been delivered (Overview §23:
// "allowed only after the order is delivered/completed") and only once —
// `item.review` being present means it's already been left.
function ReviewItemRow({ item }: { item: OrderItem }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const createReview = useCreateReview();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createReview.mutate({ orderItemId: item.id, rating, comment: comment.trim() || undefined });
  }

  const lineTotal = formatNaira(Number(item.priceSnapshot) * item.quantity);

  if (item.review) {
    return (
      <li className="flex items-center justify-between text-sm">
        <span>
          {item.productNameSnapshot} × {item.quantity}
        </span>
        <span className="flex items-center gap-2">
          <span>{lineTotal}</span>
          <span className="text-xs text-foreground/50">Reviewed</span>
        </span>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <span>
          {item.productNameSnapshot} × {item.quantity}
        </span>
        <span className="flex items-center gap-2">
          <span>{lineTotal}</span>
          {!open && !createReview.isSuccess && (
            <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium underline">
              Leave a review
            </button>
          )}
        </span>
      </div>

      {createReview.isSuccess ? (
        <p className="text-xs text-foreground/50">Thanks for your review.</p>
      ) : (
        open && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-black/10 p-3 dark:border-white/10">
            {createReview.isError && <FormMessage type="error">{getErrorMessage(createReview.error)}</FormMessage>}
            <label className="flex items-center gap-2 text-xs">
              Rating
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment"
              rows={2}
              className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
            />
            <Button type="submit" loading={createReview.isPending} className="self-start">
              Submit review
            </Button>
          </form>
        )
      )}
    </li>
  );
}

// A rejected refund request doesn't block filing a new one (Phase 13,
// mirrors product reports' "a dismissed report doesn't block a new one");
// any other status (REQUESTED/APPROVED/PROCESSED) is shown as read-only.
function RefundSection({ sellerOrder, orderStatus }: { sellerOrder: SellerOrder; orderStatus: OrderStatus }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const requestRefund = useRequestRefund();
  const latestRefund = sellerOrder.refunds[0];

  const canRequest =
    orderStatus !== "PENDING_PAYMENT" && orderStatus !== "CANCELLED" && (!latestRefund || latestRefund.status === "REJECTED");

  if (latestRefund && latestRefund.status !== "REJECTED") {
    return (
      <p className="mt-2 text-xs text-foreground/60">
        Refund {latestRefund.status.toLowerCase()} · {formatNaira(latestRefund.amount)}
      </p>
    );
  }

  if (!canRequest) return null;

  return (
    <div className="mt-2">
      {latestRefund?.status === "REJECTED" && !open && !requestRefund.isSuccess && (
        <p className="mb-1 text-xs text-foreground/50">Your previous refund request was rejected.</p>
      )}
      {requestRefund.isSuccess ? (
        <p className="text-xs text-foreground/50">Refund request submitted.</p>
      ) : !open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium underline">
          Request a refund
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestRefund.mutate({ sellerOrderId: sellerOrder.id, reason });
          }}
          className="flex flex-col gap-2 rounded-md border border-black/10 p-3 dark:border-white/10"
        >
          {requestRefund.isError && <FormMessage type="error">{getErrorMessage(requestRefund.error)}</FormMessage>}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you requesting a refund?"
            rows={2}
            required
            minLength={3}
            className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
          />
          <Button type="submit" variant="danger" loading={requestRefund.isPending} className="self-start">
            Submit request
          </Button>
        </form>
      )}
    </div>
  );
}

function SellerOrderCard({ sellerOrder, orderStatus }: { sellerOrder: SellerOrder; orderStatus: OrderStatus }) {
  return (
    <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{sellerOrder.store.name}</h3>
        <span className="text-xs font-medium text-foreground/60">{sellerOrderStatusLabel[sellerOrder.status]}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {sellerOrder.items.map((item) =>
          sellerOrder.status === "DELIVERED" ? (
            <ReviewItemRow key={item.id} item={item} />
          ) : (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.productNameSnapshot} × {item.quantity}
              </span>
              <span>{formatNaira(Number(item.priceSnapshot) * item.quantity)}</span>
            </li>
          )
        )}
      </ul>
      <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-sm dark:border-white/10">
        <span className="text-foreground/60">Shipping</span>
        <span>{formatNaira(sellerOrder.shippingFee)}</span>
      </div>
      <div className="flex justify-between text-sm font-medium">
        <span>Seller total</span>
        <span>{formatNaira(sellerOrder.total)}</span>
      </div>
      <RefundSection sellerOrder={sellerOrder} orderStatus={orderStatus} />
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
          <SellerOrderCard key={sellerOrder.id} sellerOrder={sellerOrder} orderStatus={order.status} />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/10">
        <span className="text-sm text-foreground/60">Payment: {order.payment.status}</span>
        <span className="text-lg font-semibold">{formatNaira(order.totalAmount)}</span>
      </div>
    </div>
  );
}

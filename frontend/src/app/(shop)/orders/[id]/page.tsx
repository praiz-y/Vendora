"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { StarRatingPicker } from "@/components/ui/StarRatingPicker";
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

const sellerOrderStatusVariant: Record<SellerOrder["status"], BadgeVariant> = {
  PENDING: "warning",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "neutral",
};

const orderStatusVariant: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: "warning",
  PAID: "info",
  PARTIALLY_PROCESSING: "info",
  PARTIALLY_SHIPPED: "info",
  PARTIALLY_DELIVERED: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

function ItemThumbnail({ item }: { item: OrderItem }) {
  const image = item.product.images[0];
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-alt">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[9px] text-light">No image</span>
      )}
    </div>
  );
}

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
      <li className="flex items-center gap-3 text-sm">
        <ItemThumbnail item={item} />
        <span className="flex-1">
          {item.productNameSnapshot} × {item.quantity}
        </span>
        <span className="flex items-center gap-2">
          <span>{lineTotal}</span>
          <span className="text-xs text-light">Reviewed</span>
        </span>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-3">
        <ItemThumbnail item={item} />
        <span className="flex-1">
          {item.productNameSnapshot} × {item.quantity}
        </span>
        <span className="flex items-center gap-2">
          <span>{lineTotal}</span>
          {!open && !createReview.isSuccess && (
            <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-primary underline">
              Leave a review
            </button>
          )}
        </span>
      </div>

      {createReview.isSuccess ? (
        <p className="text-xs text-light">Thanks for your review.</p>
      ) : (
        open && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-border p-3">
            {createReview.isError && <FormMessage type="error">{getErrorMessage(createReview.error)}</FormMessage>}
            <div className="flex items-center gap-2 text-xs text-body">
              Rating
              <StarRatingPicker value={rating} onChange={setRating} />
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment"
              rows={2}
              className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm text-body outline-none"
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
      <p className="mt-2 text-xs text-muted">
        Refund {latestRefund.status.toLowerCase()} · {formatNaira(latestRefund.amount)}
      </p>
    );
  }

  if (!canRequest) return null;

  return (
    <div className="mt-2">
      {latestRefund?.status === "REJECTED" && !open && !requestRefund.isSuccess && (
        <p className="mb-1 text-xs text-light">Your previous refund request was rejected.</p>
      )}
      {requestRefund.isSuccess ? (
        <p className="text-xs text-light">Refund request submitted.</p>
      ) : !open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-primary underline">
          Request a refund
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestRefund.mutate({ sellerOrderId: sellerOrder.id, reason });
          }}
          className="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          {requestRefund.isError && <FormMessage type="error">{getErrorMessage(requestRefund.error)}</FormMessage>}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you requesting a refund?"
            rows={2}
            required
            minLength={3}
            className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm text-body outline-none"
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
    <div className="rounded-md border border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-heading">{sellerOrder.store.name}</h3>
        <Badge variant={sellerOrderStatusVariant[sellerOrder.status]}>{sellerOrderStatusLabel[sellerOrder.status]}</Badge>
      </div>
      <ul className="flex flex-col gap-2">
        {sellerOrder.items.map((item) =>
          sellerOrder.status === "DELIVERED" ? (
            <ReviewItemRow key={item.id} item={item} />
          ) : (
            <li key={item.id} className="flex items-center gap-3 text-sm">
              <ItemThumbnail item={item} />
              <span className="flex-1">
                {item.productNameSnapshot} × {item.quantity}
              </span>
              <span>{formatNaira(Number(item.priceSnapshot) * item.quantity)}</span>
            </li>
          )
        )}
      </ul>
      <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted">Shipping</span>
        <span className="text-body">{formatNaira(sellerOrder.shippingFee)}</span>
      </div>
      <div className="flex justify-between text-sm font-medium text-heading">
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

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted">Loading…</div>;
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
        <Link href="/orders" className="text-sm text-muted hover:underline">
          ← Back to orders
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-heading">Order #{order.id.slice(-8)}</h1>
        <p className="flex items-center gap-2 text-sm text-muted">
          Placed {new Date(order.placedAt).toLocaleString()} ·
          <Badge variant={orderStatusVariant[order.status]}>{order.status.replace(/_/g, " ")}</Badge>
        </p>
      </div>

      {order.status === "PENDING_PAYMENT" && (
        <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-badge-warning-bg p-4">
          <p className="text-sm text-badge-warning-text">This order is awaiting payment.</p>
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
        <div className="rounded-md border border-border p-4 text-sm text-body">
          <h2 className="mb-1 font-semibold text-heading">Shipping to</h2>
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

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm text-muted">Payment: {order.payment.status}</span>
        <span className="text-lg font-semibold text-heading">{formatNaira(order.totalAmount)}</span>
      </div>
    </div>
  );
}

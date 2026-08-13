"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
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

const statusBadgeVariant: Record<SellerOrderStatus, BadgeVariant> = {
  PENDING: "warning",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "neutral",
};

function isSellerOrderStatus(value: string | null): value is SellerOrderStatus {
  return value !== null && statusTabs.some((tab) => tab.value === value);
}

function SellerOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("status");
  const status = isSellerOrderStatus(rawStatus) ? rawStatus : undefined;
  const { data, isLoading, isError, error } = useMySellerOrders({ status });

  function setStatus(next: SellerOrderStatus | undefined) {
    router.push(next ? `/seller/orders?status=${next}` : "/seller/orders");
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Orders</h2>
        <p className="mt-1 text-sm text-muted">Manage your portion of buyer orders.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === tab.value ? "bg-primary text-white" : "border border-border text-body hover:bg-surface-alt"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {data?.sellerOrders.length === 0 && <p className="text-sm text-muted">No orders in this category.</p>}

      <div className="flex flex-col gap-3">
        {data?.sellerOrders.map((sellerOrder) => (
          <Link
            key={sellerOrder.id}
            href={`/seller/orders/${sellerOrder.id}`}
            className="flex items-center justify-between rounded-md border border-border p-4 hover:bg-surface-alt"
          >
            <div>
              <p className="text-sm font-medium text-heading">Order #{sellerOrder.id.slice(-8)}</p>
              <p className="text-sm text-muted">
                {sellerOrder.order.buyer.firstName} {sellerOrder.order.buyer.lastName} ·{" "}
                {new Date(sellerOrder.createdAt).toLocaleDateString()} · {formatNaira(sellerOrder.total)}
              </p>
            </div>
            <Badge variant={statusBadgeVariant[sellerOrder.status]}>{sellerOrder.status}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SellerOrdersPage() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted">Loading…</p>}>
      <SellerOrdersContent />
    </Suspense>
  );
}

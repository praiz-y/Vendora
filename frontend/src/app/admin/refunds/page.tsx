"use client";

import Link from "next/link";
import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminRefunds } from "@/features/admin/refunds/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { RefundStatus } from "@/types/refund";

const statusTabs: { label: string; value: RefundStatus | undefined }[] = [
  { label: "Requested", value: "REQUESTED" },
  { label: "Processed", value: "PROCESSED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: undefined },
];

const statusBadgeClasses: Record<RefundStatus, string> = {
  REQUESTED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PROCESSED: "bg-green-500/10 text-green-700 dark:text-green-400",
  REJECTED: "bg-black/10 text-foreground/50 dark:bg-white/10",
};

export default function AdminRefundsPage() {
  const [status, setStatus] = useState<RefundStatus | undefined>("REQUESTED");
  const { data, isLoading, isError, error } = useAdminRefunds({ status });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Refunds</h2>
        <p className="mt-1 text-sm text-foreground/60">Review buyer refund requests and process approved ones.</p>
      </div>

      <div className="flex gap-2">
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

      <div className="flex flex-col gap-3">
        {data?.refunds.map((refund) => (
          <Link
            key={refund.id}
            href={`/admin/refunds/${refund.id}`}
            className="flex items-center justify-between rounded-md border border-black/10 p-4 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium">{refund.sellerOrder.store.name}</p>
              <p className="text-sm text-foreground/60">
                {refund.requestedBy.firstName} {refund.requestedBy.lastName} · {formatNaira(refund.amount)}
              </p>
            </div>
            <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeClasses[refund.status]}`}>
              {refund.status}
            </span>
          </Link>
        ))}
        {data?.refunds.length === 0 && <p className="text-sm text-foreground/60">No refunds in this category.</p>}
      </div>
    </div>
  );
}

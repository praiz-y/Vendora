"use client";

import { Suspense } from "react";
import { AdminMasterDetail } from "@/components/admin/AdminMasterDetail";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminRefunds } from "@/features/admin/refunds/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import { useAdminDetailSelection } from "@/lib/useAdminDetailSelection";
import { useAdminUrlFilters } from "@/lib/useAdminUrlFilters";
import type { RefundStatus } from "@/types/refund";
import { RefundDetail } from "./_components/RefundDetail";

const statusTabs: { label: string; value: RefundStatus | undefined }[] = [
  { label: "Requested", value: "REQUESTED" },
  { label: "Processed", value: "PROCESSED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: undefined },
];

const statusVariant: Record<RefundStatus, BadgeVariant> = {
  REQUESTED: "warning",
  APPROVED: "info",
  PROCESSED: "success",
  REJECTED: "neutral",
};

function RefundsList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { get, set } = useAdminUrlFilters();
  const status = (get("status", "REQUESTED") || undefined) as RefundStatus | undefined;
  const { data, isLoading, isError, error } = useAdminRefunds({ status });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Refunds</h2>
        <p className="mt-1 text-sm text-muted">Review buyer refund requests and process approved ones.</p>
      </div>

      <div className="flex gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => set({ status: tab.value })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === tab.value ? "bg-primary-hover text-white" : "border border-border-admin text-body transition-colors hover:bg-surface-alt"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-3">
        {data?.refunds.map((refund) => (
          <button
            key={refund.id}
            onClick={() => onSelect(refund.id)}
            className={`flex items-center justify-between rounded-md border p-4 text-left transition-colors hover:bg-surface-alt ${
              selectedId === refund.id ? "border-primary" : "border-border-admin"
            }`}
          >
            <div>
              <p className="text-sm font-medium text-heading">{refund.sellerOrder.store.name}</p>
              <p className="text-sm text-muted">
                {refund.requestedBy.firstName} {refund.requestedBy.lastName} · {formatNaira(refund.amount)}
              </p>
            </div>
            <Badge variant={statusVariant[refund.status]}>{refund.status}</Badge>
          </button>
        ))}
        {data?.refunds.length === 0 && <p className="text-sm text-muted">No refunds in this category.</p>}
      </div>
    </div>
  );
}

function AdminRefundsContent() {
  const { selectedId, select, clear } = useAdminDetailSelection();

  return (
    <AdminMasterDetail
      list={<RefundsList selectedId={selectedId} onSelect={select} />}
      detail={selectedId ? <RefundDetail id={selectedId} /> : null}
      detailKey={selectedId}
      onCloseDetail={clear}
    />
  );
}

export default function AdminRefundsPage() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted">Loading…</p>}>
      <AdminRefundsContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useState } from "react";
import { AdminBulkBar } from "@/components/admin/AdminBulkBar";
import { AdminMasterDetail } from "@/components/admin/AdminMasterDetail";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { FormMessage } from "@/components/ui/FormMessage";
import {
  useAdminProductReports,
  useBulkDismissProductReports,
  useBulkResolveProductReports,
} from "@/features/admin/productReports/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { useAdminDetailSelection } from "@/lib/useAdminDetailSelection";
import { useAdminUrlFilters } from "@/lib/useAdminUrlFilters";
import { reportReasonLabels } from "@/types/productReport";
import type { ProductReportStatus } from "@/types/productReport";
import { ProductReportDetail } from "./_components/ProductReportDetail";

const statusTabs: { label: string; value: ProductReportStatus | undefined }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Dismissed", value: "DISMISSED" },
  { label: "All", value: undefined },
];

const statusVariant: Record<ProductReportStatus, BadgeVariant> = {
  PENDING: "warning",
  RESOLVED: "success",
  DISMISSED: "neutral",
};

function ProductReportsList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { get, set } = useAdminUrlFilters();
  const status = (get("status", "PENDING") || undefined) as ProductReportStatus | undefined;
  const { data, isLoading, isError, error } = useAdminProductReports({ status });
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const bulkResolve = useBulkResolveProductReports();
  const bulkDismiss = useBulkDismissProductReports();
  const bulkPending = bulkResolve.isPending || bulkDismiss.isPending;

  function handleStatusChange(next: ProductReportStatus | undefined) {
    setChecked(new Set());
    set({ status: next });
  }

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    setChecked((prev) => (prev.size === data.reports.length ? new Set() : new Set(data.reports.map((r) => r.id))));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Product Reports</h2>
        <p className="mt-1 text-sm text-muted">Review reports submitted by buyers and resolve or dismiss them.</p>
      </div>

      <div className="flex gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleStatusChange(tab.value)}
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
      {bulkResolve.isError && <FormMessage type="error">{getErrorMessage(bulkResolve.error)}</FormMessage>}
      {bulkDismiss.isError && <FormMessage type="error">{getErrorMessage(bulkDismiss.error)}</FormMessage>}

      {status === "PENDING" && !!data?.reports.length && (
        <>
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={checked.size > 0 && checked.size === data.reports.length} onChange={toggleAll} />
            Select all on this page
          </label>
          <AdminBulkBar
            count={checked.size}
            approveLabel="Resolve"
            approvePending={bulkResolve.isPending}
            onApprove={() => bulkResolve.mutate(Array.from(checked), { onSuccess: () => setChecked(new Set()) })}
            rejectLabel="Dismiss"
            rejectPending={bulkDismiss.isPending}
            onReject={(resolutionNote) =>
              bulkDismiss.mutate(
                { ids: Array.from(checked), resolutionNote },
                { onSuccess: () => setChecked(new Set()) }
              )
            }
            onClear={() => setChecked(new Set())}
          />
        </>
      )}

      <div className="flex flex-col gap-3">
        {data?.reports.map((report) => (
          <div
            key={report.id}
            className={`flex items-center gap-3 rounded-md border p-4 ${
              selectedId === report.id ? "border-primary" : "border-border-admin"
            }`}
          >
            {status === "PENDING" && (
              <input
                type="checkbox"
                aria-label={`Select report on ${report.product.name}`}
                checked={checked.has(report.id)}
                onChange={() => toggleChecked(report.id)}
                disabled={bulkPending}
              />
            )}
            <button onClick={() => onSelect(report.id)} className="flex flex-1 items-center justify-between text-left">
              <div>
                <p className="text-sm font-medium text-heading">{report.product.name}</p>
                <p className="text-sm text-muted">
                  {reportReasonLabels[report.reason as keyof typeof reportReasonLabels] ?? report.reason} · reported by{" "}
                  {report.reporter.firstName} {report.reporter.lastName}
                </p>
              </div>
              <Badge variant={statusVariant[report.status]}>{report.status}</Badge>
            </button>
          </div>
        ))}
        {data?.reports.length === 0 && <p className="text-sm text-muted">No reports in this category.</p>}
      </div>
    </div>
  );
}

function AdminProductReportsContent() {
  const { selectedId, select, clear } = useAdminDetailSelection();

  return (
    <AdminMasterDetail
      list={<ProductReportsList selectedId={selectedId} onSelect={select} />}
      detail={selectedId ? <ProductReportDetail id={selectedId} /> : null}
      detailKey={selectedId}
      onCloseDetail={clear}
    />
  );
}

export default function AdminProductReportsPage() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted">Loading…</p>}>
      <AdminProductReportsContent />
    </Suspense>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailRow } from "@/components/admin/DetailRow";
import { FormMessage } from "@/components/ui/FormMessage";
import { Textarea } from "@/components/ui/Textarea";
import {
  useAdminProductReport,
  useDismissProductReport,
  useResolveProductReport,
} from "@/features/admin/productReports/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { reportReasonLabels } from "@/types/productReport";
import type { ProductReportStatus } from "@/types/productReport";

const statusVariant: Record<ProductReportStatus, BadgeVariant> = {
  PENDING: "warning",
  RESOLVED: "success",
  DISMISSED: "neutral",
};

export function ProductReportDetail({ id }: { id: string }) {
  const { data: report, isLoading, isError, error } = useAdminProductReport(id);
  const resolve = useResolveProductReport();
  const dismiss = useDismissProductReport();
  const [resolutionNote, setResolutionNote] = useState("");
  const [showResolveForm, setShowResolveForm] = useState<"resolve" | "dismiss" | null>(null);

  function handleFinalize(e: FormEvent) {
    e.preventDefault();
    if (showResolveForm === "resolve") resolve.mutate({ id, resolutionNote: resolutionNote.trim() || undefined });
    if (showResolveForm === "dismiss") dismiss.mutate({ id, resolutionNote: resolutionNote.trim() || undefined });
  }

  if (isLoading) return <p className="py-6 text-sm text-muted">Loading…</p>;
  if (isError || !report) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const isPending = report.status === "PENDING";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">{report.product.name}</h2>
        <div className="mt-1">
          <Badge variant={statusVariant[report.status]}>{report.status}</Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-md border border-border-admin p-4">
        <DetailRow label="Reason" value={reportReasonLabels[report.reason as keyof typeof reportReasonLabels] ?? report.reason} />
        <DetailRow label="Reported by" value={`${report.reporter.firstName} ${report.reporter.lastName}`} />
        <div className="col-span-2">
          <DetailRow label="Description" value={report.description ?? "—"} />
        </div>
        <DetailRow label="Submitted" value={new Date(report.createdAt).toLocaleString()} />
        {report.resolvedBy && (
          <>
            <DetailRow label="Reviewed by" value={`${report.resolvedBy.firstName} ${report.resolvedBy.lastName}`} />
            <div className="col-span-2">
              <DetailRow label="Resolution note" value={report.resolutionNote ?? "—"} />
            </div>
          </>
        )}
      </dl>

      {isPending && (
        <div className="flex flex-col gap-4">
          {resolve.isError && <FormMessage type="error">{getErrorMessage(resolve.error)}</FormMessage>}
          {dismiss.isError && <FormMessage type="error">{getErrorMessage(dismiss.error)}</FormMessage>}

          <div className="flex gap-3">
            <Button variant="brand" onClick={() => setShowResolveForm((v) => (v === "resolve" ? null : "resolve"))}>
              Resolve
            </Button>
            <Button variant="danger" onClick={() => setShowResolveForm((v) => (v === "dismiss" ? null : "dismiss"))}>
              Dismiss
            </Button>
          </div>

          {showResolveForm && (
            <form className="flex max-w-lg flex-col gap-3" onSubmit={handleFinalize}>
              <Textarea
                label="Resolution note (optional)"
                name="resolutionNote"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
              <Button
                type="submit"
                variant={showResolveForm === "dismiss" ? "danger" : "brand"}
                loading={resolve.isPending || dismiss.isPending}
                className="self-start"
              >
                Confirm {showResolveForm}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

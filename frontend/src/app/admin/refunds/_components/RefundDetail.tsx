"use client";

import { useState, type FormEvent } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailRow } from "@/components/admin/DetailRow";
import { FormMessage } from "@/components/ui/FormMessage";
import { Textarea } from "@/components/ui/Textarea";
import { useAdminRefund, useApproveRefund, useRejectRefund } from "@/features/admin/refunds/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { RefundStatus } from "@/types/refund";

const statusVariant: Record<RefundStatus, BadgeVariant> = {
  REQUESTED: "warning",
  APPROVED: "info",
  PROCESSED: "success",
  REJECTED: "neutral",
};

export function RefundDetail({ id }: { id: string }) {
  const { data: refund, isLoading, isError, error } = useAdminRefund(id);
  const approve = useApproveRefund();
  const reject = useRejectRefund();
  const [reviewNote, setReviewNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  function handleReject(e: FormEvent) {
    e.preventDefault();
    reject.mutate({ id, reviewNote: reviewNote.trim() || undefined });
  }

  function handleApprove() {
    approve.mutate(id, { onSuccess: () => setShowApproveConfirm(false) });
  }

  if (isLoading) return <p className="py-6 text-sm text-muted">Loading…</p>;
  if (isError || !refund) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const isPending = refund.status === "REQUESTED";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">{refund.sellerOrder.store.name}</h2>
        <div className="mt-1">
          <Badge variant={statusVariant[refund.status]}>{refund.status}</Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-md border border-border-admin p-4">
        <DetailRow label="Amount" value={formatNaira(refund.amount)} />
        <DetailRow label="Requested by" value={`${refund.requestedBy.firstName} ${refund.requestedBy.lastName}`} />
        <div className="col-span-2">
          <DetailRow label="Reason" value={refund.reason} />
        </div>
        <DetailRow label="Requested" value={new Date(refund.createdAt).toLocaleString()} />
        {refund.reviewedBy && (
          <>
            <DetailRow label="Reviewed by" value={`${refund.reviewedBy.firstName} ${refund.reviewedBy.lastName}`} />
            {refund.providerRefundReference && <DetailRow label="Provider reference" value={refund.providerRefundReference} />}
          </>
        )}
      </dl>

      {isPending && (
        <div className="flex flex-col gap-4">
          {approve.isError && <FormMessage type="error">{getErrorMessage(approve.error)}</FormMessage>}
          {reject.isError && <FormMessage type="error">{getErrorMessage(reject.error)}</FormMessage>}

          <div className="flex gap-3">
            <Button variant="brand" onClick={() => setShowApproveConfirm((v) => !v)} disabled={reject.isPending}>
              Approve &amp; Process
            </Button>
            <Button variant="danger" onClick={() => setShowRejectForm((v) => !v)} disabled={approve.isPending}>
              Reject
            </Button>
          </div>

          {showApproveConfirm && (
            <div className="flex max-w-lg flex-col gap-3 rounded-md border border-border-admin bg-surface-alt p-4">
              <p className="text-sm text-body">
                This processes a real refund payment to the buyer immediately and can&apos;t be undone. Confirm?
              </p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={handleApprove} loading={approve.isPending}>
                  Yes, approve &amp; process
                </Button>
                <Button variant="secondary" onClick={() => setShowApproveConfirm(false)} disabled={approve.isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {showRejectForm && (
            <form className="flex max-w-lg flex-col gap-3" onSubmit={handleReject}>
              <Textarea
                label="Rejection note (optional)"
                name="reviewNote"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
              <Button type="submit" variant="danger" loading={reject.isPending} className="self-start">
                Confirm rejection
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

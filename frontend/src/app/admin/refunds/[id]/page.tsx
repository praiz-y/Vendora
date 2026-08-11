"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Textarea } from "@/components/ui/Textarea";
import { useAdminRefund, useApproveRefund, useRejectRefund } from "@/features/admin/refunds/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export default function AdminRefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: refund, isLoading, isError, error } = useAdminRefund(id);
  const approve = useApproveRefund();
  const reject = useRejectRefund();
  const [reviewNote, setReviewNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  function handleReject(e: FormEvent) {
    e.preventDefault();
    reject.mutate({ id, reviewNote: reviewNote.trim() || undefined });
  }

  if (isLoading) return <p className="py-6 text-sm text-foreground/60">Loading…</p>;
  if (isError || !refund) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const isPending = refund.status === "REQUESTED";

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <Link href="/admin/refunds" className="text-sm text-foreground/60 hover:underline">
          ← Back to refunds
        </Link>
        <h2 className="mt-2 text-lg font-semibold">{refund.sellerOrder.store.name}</h2>
        <p className="text-sm text-foreground/60">Status: {refund.status}</p>
      </div>

      <dl className="grid max-w-lg grid-cols-2 gap-4 rounded-md border border-black/10 p-4 dark:border-white/10">
        <DetailRow label="Amount" value={formatNaira(refund.amount)} />
        <DetailRow label="Requested by" value={`${refund.requestedBy.firstName} ${refund.requestedBy.lastName}`} />
        <div className="col-span-2">
          <DetailRow label="Reason" value={refund.reason} />
        </div>
        <DetailRow label="Requested" value={new Date(refund.createdAt).toLocaleString()} />
        {refund.reviewedBy && (
          <>
            <DetailRow label="Reviewed by" value={`${refund.reviewedBy.firstName} ${refund.reviewedBy.lastName}`} />
            {refund.providerRefundReference && (
              <DetailRow label="Provider reference" value={refund.providerRefundReference} />
            )}
          </>
        )}
      </dl>

      {isPending && (
        <div className="flex flex-col gap-4">
          {approve.isError && <FormMessage type="error">{getErrorMessage(approve.error)}</FormMessage>}
          {reject.isError && <FormMessage type="error">{getErrorMessage(reject.error)}</FormMessage>}

          <div className="flex gap-3">
            <Button onClick={() => approve.mutate(id)} loading={approve.isPending}>
              Approve &amp; Process
            </Button>
            <Button variant="danger" onClick={() => setShowRejectForm((v) => !v)}>
              Reject
            </Button>
          </div>

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

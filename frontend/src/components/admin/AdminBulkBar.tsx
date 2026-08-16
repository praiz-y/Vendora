"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

// Shared by every admin queue that gets bulk actions (Products, Product
// Reports) — triaging a queue one item at a time was the single biggest
// Alex/power-user complaint from the admin design critique.
export function AdminBulkBar({
  count,
  onApprove,
  approveLabel = "Approve",
  approvePending,
  onReject,
  rejectLabel = "Reject",
  rejectPending,
  onClear,
}: {
  count: number;
  onApprove: () => void;
  approveLabel?: string;
  approvePending: boolean;
  onReject: (reason: string) => void;
  rejectLabel?: string;
  rejectPending: boolean;
  onClear: () => void;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");

  function handleReject(e: FormEvent) {
    e.preventDefault();
    onReject(reason);
  }

  if (count === 0) return null;

  return (
    <div className="flex animate-admin-pop-in flex-col gap-3 rounded-md border border-primary-hover bg-primary-light p-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-heading">{count} selected</p>
        <Button variant="brand" onClick={onApprove} loading={approvePending} disabled={rejectPending}>
          {approveLabel} {count}
        </Button>
        <Button variant="danger" onClick={() => setShowRejectForm((v) => !v)} disabled={approvePending}>
          {rejectLabel} {count}
        </Button>
        <Button variant="secondary" onClick={onClear} disabled={approvePending || rejectPending}>
          Clear selection
        </Button>
      </div>
      {showRejectForm && (
        <form className="flex max-w-lg flex-col gap-3" onSubmit={handleReject}>
          <Textarea
            label={`Reason (applied to all ${count})`}
            name="bulkReason"
            required
            minLength={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" variant="danger" loading={rejectPending} className="self-start">
            Confirm {rejectLabel.toLowerCase()}
          </Button>
        </form>
      )}
    </div>
  );
}

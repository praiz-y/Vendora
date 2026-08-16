"use client";

import { useState, type FormEvent } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailRow } from "@/components/admin/DetailRow";
import { FormMessage } from "@/components/ui/FormMessage";
import { Textarea } from "@/components/ui/Textarea";
import {
  useAdminSellerApplication,
  useApproveSellerApplication,
  useRejectSellerApplication,
} from "@/features/admin/sellerApplications/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { SellerApplicationStatus } from "@/types/store";

const statusVariant: Record<SellerApplicationStatus, BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

// Shared by the standalone /admin/seller-applications/[id] route (a direct-
// link fallback, full page, no master list) and the list page's inline
// master-detail panel (Overhaul Phase 10) — same component either way.
export function SellerApplicationDetail({ id }: { id: string }) {
  const { data: application, isLoading, isError, error } = useAdminSellerApplication(id);
  const approve = useApproveSellerApplication();
  const reject = useRejectSellerApplication();
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  function handleReject(e: FormEvent) {
    e.preventDefault();
    reject.mutate({ id, reason });
  }

  if (isLoading) return <p className="py-6 text-sm text-muted">Loading…</p>;
  if (isError || !application) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const isPending = application.status === "PENDING";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">{application.storeName}</h2>
        <div className="mt-1">
          <Badge variant={statusVariant[application.status]}>{application.status}</Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-md border border-border-admin p-4">
        <DetailRow
          label="Applicant"
          value={`${application.applicant.firstName} ${application.applicant.lastName} (@${application.applicant.username})`}
        />
        <DetailRow label="Applicant email" value={application.applicant.email} />
        <DetailRow label="Business category" value={application.businessCategory} />
        <DetailRow label="Location" value={application.location} />
        <DetailRow label="Business phone" value={application.phone} />
        <DetailRow label="Business email" value={application.email} />
        {application.businessRegistration && (
          <DetailRow label="Business registration" value={application.businessRegistration} />
        )}
        <div className="col-span-2">
          <DetailRow label="Store description" value={application.storeDescription} />
        </div>
        {application.status === "REJECTED" && (
          <div className="col-span-2">
            <DetailRow label="Rejection reason" value={application.rejectionReason} />
          </div>
        )}
      </dl>

      {isPending && (
        <div className="flex flex-col gap-4">
          {approve.isError && <FormMessage type="error">{getErrorMessage(approve.error)}</FormMessage>}
          {reject.isError && <FormMessage type="error">{getErrorMessage(reject.error)}</FormMessage>}

          <div className="flex gap-3">
            <Button variant="brand" onClick={() => approve.mutate(id)} loading={approve.isPending}>
              Approve
            </Button>
            <Button variant="danger" onClick={() => setShowRejectForm((v) => !v)}>
              Reject
            </Button>
          </div>

          {showRejectForm && (
            <form className="flex max-w-lg flex-col gap-3" onSubmit={handleReject}>
              <Textarea
                label="Rejection reason"
                name="reason"
                required
                minLength={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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

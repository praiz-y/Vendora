"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Textarea } from "@/components/ui/Textarea";
import {
  useAdminSellerApplication,
  useApproveSellerApplication,
  useRejectSellerApplication,
} from "@/features/admin/sellerApplications/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export default function AdminSellerApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: application, isLoading, isError, error } = useAdminSellerApplication(id);
  const approve = useApproveSellerApplication();
  const reject = useRejectSellerApplication();
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  function handleReject(e: FormEvent) {
    e.preventDefault();
    reject.mutate({ id, reason });
  }

  if (isLoading) return <p className="py-6 text-sm text-foreground/60">Loading…</p>;
  if (isError || !application) return <FormMessage type="error">{getErrorMessage(error)}</FormMessage>;

  const isPending = application.status === "PENDING";

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <Link href="/admin/seller-applications" className="text-sm text-foreground/60 hover:underline">
          ← Back to applications
        </Link>
        <h2 className="mt-2 text-lg font-semibold">{application.storeName}</h2>
        <p className="text-sm text-foreground/60">Status: {application.status}</p>
      </div>

      <dl className="grid max-w-lg grid-cols-2 gap-4 rounded-md border border-black/10 p-4 dark:border-white/10">
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
            <Button onClick={() => approve.mutate(id)} loading={approve.isPending}>
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

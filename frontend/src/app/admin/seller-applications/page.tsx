"use client";

import Link from "next/link";
import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminSellerApplications } from "@/features/admin/sellerApplications/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { SellerApplicationStatus } from "@/types/store";

const statusTabs: { label: string; value: SellerApplicationStatus | undefined }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: undefined },
];

const statusBadgeClasses: Record<SellerApplicationStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function AdminSellerApplicationsPage() {
  const [status, setStatus] = useState<SellerApplicationStatus | undefined>("PENDING");
  const { data, isLoading, isError, error } = useAdminSellerApplications({ status });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Seller Applications</h2>
        <p className="mt-1 text-sm text-foreground/60">Review and approve or reject seller applications.</p>
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
        {data?.applications.map((application) => (
          <Link
            key={application.id}
            href={`/admin/seller-applications/${application.id}`}
            className="flex items-center justify-between rounded-md border border-black/10 p-4 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium">{application.storeName}</p>
              <p className="text-sm text-foreground/60">
                {application.applicant.firstName} {application.applicant.lastName} (@{application.applicant.username})
              </p>
              <p className="text-xs text-foreground/50">
                Submitted {new Date(application.submittedAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeClasses[application.status]}`}>
              {application.status}
            </span>
          </Link>
        ))}
        {data?.applications.length === 0 && (
          <p className="text-sm text-foreground/60">No applications in this category.</p>
        )}
      </div>
    </div>
  );
}

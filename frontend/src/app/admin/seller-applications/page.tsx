"use client";

import { Suspense } from "react";
import { AdminMasterDetail } from "@/components/admin/AdminMasterDetail";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminSellerApplications } from "@/features/admin/sellerApplications/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { useAdminDetailSelection } from "@/lib/useAdminDetailSelection";
import { useAdminUrlFilters } from "@/lib/useAdminUrlFilters";
import type { SellerApplicationStatus } from "@/types/store";
import { SellerApplicationDetail } from "./_components/SellerApplicationDetail";

const statusTabs: { label: string; value: SellerApplicationStatus | undefined }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: undefined },
];

const statusVariant: Record<SellerApplicationStatus, BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

function SellerApplicationsList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { get, set } = useAdminUrlFilters();
  const status = (get("status", "PENDING") || undefined) as SellerApplicationStatus | undefined;
  const { data, isLoading, isError, error } = useAdminSellerApplications({ status });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Seller Applications</h2>
        <p className="mt-1 text-sm text-muted">Review and approve or reject seller applications.</p>
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
        {data?.applications.map((application) => (
          <button
            key={application.id}
            onClick={() => onSelect(application.id)}
            className={`flex items-center justify-between rounded-md border p-4 text-left transition-colors hover:bg-surface-alt ${
              selectedId === application.id ? "border-primary" : "border-border-admin"
            }`}
          >
            <div>
              <p className="text-sm font-medium text-heading">{application.storeName}</p>
              <p className="text-sm text-muted">
                {application.applicant.firstName} {application.applicant.lastName} (@{application.applicant.username})
              </p>
              <p className="text-xs text-light">Submitted {new Date(application.submittedAt).toLocaleDateString()}</p>
            </div>
            <Badge variant={statusVariant[application.status]}>{application.status}</Badge>
          </button>
        ))}
        {data?.applications.length === 0 && <p className="text-sm text-muted">No applications in this category.</p>}
      </div>
    </div>
  );
}

function AdminSellerApplicationsContent() {
  const { selectedId, select, clear } = useAdminDetailSelection();

  return (
    <AdminMasterDetail
      list={<SellerApplicationsList selectedId={selectedId} onSelect={select} />}
      detail={selectedId ? <SellerApplicationDetail id={selectedId} /> : null}
      detailKey={selectedId}
      onCloseDetail={clear}
    />
  );
}

export default function AdminSellerApplicationsPage() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted">Loading…</p>}>
      <AdminSellerApplicationsContent />
    </Suspense>
  );
}

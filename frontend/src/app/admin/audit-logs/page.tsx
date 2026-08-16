"use client";

import { Suspense } from "react";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminAuditLogs } from "@/features/admin/auditLogs/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { useAdminUrlFilters } from "@/lib/useAdminUrlFilters";

// Mirrors the backend's AUDIT_LOG_ENTITY_TYPES enum
// (backend/src/modules/auditLogs/auditLogs.validation.ts) — any value
// outside this set is rejected with 422, so the filter can only offer
// entity types the API actually understands.
const entityTypeOptions: { label: string; value: string }[] = [
  { label: "All entity types", value: "" },
  { label: "User", value: "User" },
  { label: "Store", value: "Store" },
  { label: "Product", value: "Product" },
  { label: "Seller Application", value: "SellerApplication" },
  { label: "Product Report", value: "ProductReport" },
  { label: "Refund", value: "Refund" },
  { label: "Category", value: "Category" },
  { label: "Hero Slide", value: "HeroSlide" },
  { label: "Announcement", value: "Announcement" },
];

function AdminAuditLogsContent() {
  const { get, set } = useAdminUrlFilters();
  const entityType = get("entityType", "") ?? "";
  const page = Number(get("page", "1"));
  const { data, isLoading, isError, error } = useAdminAuditLogs({ entityType: entityType || undefined, page, limit: 20 });

  function handleEntityTypeChange(next: string) {
    set({ entityType: next || undefined, page: undefined });
  }

  function handlePageChange(next: number) {
    set({ page: String(next) });
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Audit Log</h2>
        <p className="mt-1 text-sm text-muted">Every recorded administrative action, most recent first.</p>
      </div>

      <select
        aria-label="Filter by entity type"
        value={entityType}
        onChange={(e) => handleEntityTypeChange(e.target.value)}
        className="max-w-xs rounded-md border border-border-admin bg-transparent px-3 py-1.5 text-sm text-body outline-none focus:ring-2 focus:ring-primary/30"
      >
        {entityTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="overflow-x-auto rounded-md border border-border-admin">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border-admin text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Entity</th>
              <th className="px-4 py-2 font-medium">Actor</th>
              <th className="px-4 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {data?.logs.map((log) => (
              <tr key={log.id} className="border-b border-border-admin last:border-0">
                <td className="px-4 py-2 font-medium text-heading">{log.action}</td>
                <td className="px-4 py-2 text-body">
                  {log.entityType} <span className="text-muted">#{log.entityId.slice(-8)}</span>
                </td>
                <td className="px-4 py-2 text-body">
                  {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "System"}
                </td>
                <td className="px-4 py-2 text-muted">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.logs.length === 0 && <p className="p-4 text-sm text-muted">No audit log entries yet.</p>}
      </div>

      <AdminPagination meta={data?.meta} page={page} onPageChange={handlePageChange} />
    </div>
  );
}

export default function AdminAuditLogsPage() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted">Loading…</p>}>
      <AdminAuditLogsContent />
    </Suspense>
  );
}

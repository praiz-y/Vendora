"use client";

import { useState } from "react";
import { FormMessage } from "@/components/ui/FormMessage";
import { useAdminAuditLogs } from "@/features/admin/auditLogs/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

export default function AdminAuditLogsPage() {
  const [entityType, setEntityType] = useState("");
  const { data, isLoading, isError, error } = useAdminAuditLogs({ entityType: entityType || undefined });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <p className="mt-1 text-sm text-foreground/60">Every recorded administrative action, most recent first.</p>
      </div>

      <input
        type="search"
        aria-label="Filter by entity type"
        value={entityType}
        onChange={(e) => setEntityType(e.target.value)}
        placeholder="Filter by entity type (e.g. Product, Refund, SellerApplication)…"
        className="max-w-sm rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:focus:ring-white/30"
      />

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-foreground/50 dark:border-white/10">
            <tr>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Entity</th>
              <th className="px-4 py-2 font-medium">Actor</th>
              <th className="px-4 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {data?.logs.map((log) => (
              <tr key={log.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-4 py-2 font-medium">{log.action}</td>
                <td className="px-4 py-2 text-foreground/70">
                  {log.entityType} <span className="text-foreground/40">#{log.entityId.slice(-8)}</span>
                </td>
                <td className="px-4 py-2 text-foreground/70">
                  {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "System"}
                </td>
                <td className="px-4 py-2 text-foreground/50">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.logs.length === 0 && <p className="p-4 text-sm text-foreground/50">No audit log entries yet.</p>}
      </div>
    </div>
  );
}

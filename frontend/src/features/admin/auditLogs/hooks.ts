"use client";

import { useQuery } from "@tanstack/react-query";
import { auditLogsApi, type ListAuditLogsParams } from "./api";

export function useAdminAuditLogs(params: ListAuditLogsParams) {
  return useQuery({
    queryKey: ["admin", "audit-logs", params],
    queryFn: () => auditLogsApi.list(params),
  });
}

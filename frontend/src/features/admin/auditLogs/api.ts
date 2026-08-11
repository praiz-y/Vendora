import { apiClient } from "@/lib/api/client";
import type { PaginationMeta } from "@/types/store";
import type { AuditLog } from "@/types/auditLog";

export interface ListAuditLogsParams {
  entityType?: string;
  action?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListAuditLogsParams): string {
  const query = new URLSearchParams();
  if (params.entityType) query.set("entityType", params.entityType);
  if (params.action) query.set("action", params.action);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const auditLogsApi = {
  list: (params: ListAuditLogsParams = {}) =>
    apiClient.get<{ logs: AuditLog[]; meta: PaginationMeta }>(`/api/v1/admin/audit-logs${buildQueryString(params)}`),
};

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../utils/pagination";

const auditLogInclude = {
  actor: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.AuditLogInclude;

export interface ListAuditLogsParams extends PaginationParams {
  entityType?: string;
  action?: string;
}

// First real UI for AuditLog (Phase 1) — every admin action recorded since
// Phase 3's seller-application approve/reject is finally readable here, not
// just written.
export async function listAuditLogs(params: ListAuditLogsParams) {
  const where = {
    ...(params.entityType ? { entityType: params.entityType } : {}),
    ...(params.action ? { action: params.action } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(params), include: auditLogInclude }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, meta: buildPaginationMeta(params, total) as PaginationMeta };
}

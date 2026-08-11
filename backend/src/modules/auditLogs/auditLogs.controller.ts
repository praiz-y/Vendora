import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { parsePagination } from "../../utils/pagination";
import * as auditLogsService from "./auditLogs.service";
import type { ListAuditLogsQuery } from "./auditLogs.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListAuditLogsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { logs, meta } = await auditLogsService.listAuditLogs({
    entityType: query.entityType,
    action: query.action,
    page,
    limit,
  });
  sendSuccess(res, { logs, meta }, "Audit logs retrieved.");
});

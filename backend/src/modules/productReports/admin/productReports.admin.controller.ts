import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { parsePagination } from "../../../utils/pagination";
import * as adminService from "./productReports.admin.service";
import type { ListProductReportsQuery, ResolveProductReportInput } from "../productReports.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProductReportsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { reports, meta } = await adminService.listReports({ status: query.status, page, limit });
  sendSuccess(res, { reports, meta }, "Reports retrieved.");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const report = await adminService.getReportById(req.params.id);
  sendSuccess(res, { report }, "Report retrieved.");
});

export const resolve = asyncHandler(async (req: Request, res: Response) => {
  const { resolutionNote } = req.body as ResolveProductReportInput;
  const report = await adminService.resolveReport(req.user!.id, req.params.id, resolutionNote);
  sendSuccess(res, { report }, "Report resolved.");
});

export const dismiss = asyncHandler(async (req: Request, res: Response) => {
  const { resolutionNote } = req.body as ResolveProductReportInput;
  const report = await adminService.dismissReport(req.user!.id, req.params.id, resolutionNote);
  sendSuccess(res, { report }, "Report dismissed.");
});

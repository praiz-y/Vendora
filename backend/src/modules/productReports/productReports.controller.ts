import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as productReportsService from "./productReports.service";
import type { CreateProductReportInput } from "./productReports.validation";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const report = await productReportsService.submitReport(req.user!.id, req.body as CreateProductReportInput);
  sendSuccess(res, { report }, "Report submitted.", 201);
});

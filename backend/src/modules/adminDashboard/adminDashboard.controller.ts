import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as adminDashboardService from "./adminDashboard.service";

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  const overview = await adminDashboardService.getOverview();
  sendSuccess(res, { overview }, "Overview retrieved.");
});

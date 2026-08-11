import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { getMyStoreId } from "../stores/stores.service";
import * as sellerDashboardService from "./sellerDashboard.service";

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const overview = await sellerDashboardService.getOverview(storeId);
  sendSuccess(res, { overview }, "Overview retrieved.");
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const analytics = await sellerDashboardService.getAnalytics(storeId);
  sendSuccess(res, { analytics }, "Analytics retrieved.");
});

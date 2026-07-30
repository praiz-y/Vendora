import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as entitlementsService from "./entitlements.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const entitlements = await entitlementsService.listMyEntitlements(req.user!.id);
  sendSuccess(res, { entitlements }, "Digital library retrieved.");
});

export const getDownload = asyncHandler(async (req: Request, res: Response) => {
  const download = await entitlementsService.getDownload(req.user!.id, req.params.productId);
  sendSuccess(res, { download }, "Download authorized.");
});

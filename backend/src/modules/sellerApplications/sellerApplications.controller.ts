import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as sellerApplicationsService from "./sellerApplications.service";
import type { SellerApplicationInput, UpdateSellerApplicationInput } from "./sellerApplications.validation";

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const application = await sellerApplicationsService.submitApplication(
    req.user!.id,
    req.body as SellerApplicationInput
  );
  sendSuccess(res, { application }, "Seller application submitted.", 201);
});

export const getMine = asyncHandler(async (req: Request, res: Response) => {
  const application = await sellerApplicationsService.getMyApplication(req.user!.id);
  sendSuccess(res, { application }, "Seller application retrieved.");
});

export const updateMine = asyncHandler(async (req: Request, res: Response) => {
  const application = await sellerApplicationsService.updateMyApplication(
    req.user!.id,
    req.body as UpdateSellerApplicationInput
  );
  sendSuccess(res, { application }, "Seller application updated.");
});

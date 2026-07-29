import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as storesService from "./stores.service";
import type { UpdateStoreInput } from "./stores.validation";

export const getMyStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await storesService.getMyStore(req.user!.id);
  sendSuccess(res, { store }, "Store retrieved.");
});

export const updateMyStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await storesService.updateMyStore(req.user!.id, req.body as UpdateStoreInput);
  sendSuccess(res, { store }, "Store updated.");
});

import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { getCurrentUser } from "../auth/auth.service";
import * as usersService from "./users.service";
import * as addressesService from "./addresses.service";
import type { AddressInput, UpdateAddressInput, UpdateProfileInput } from "./users.validation";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.id);
  sendSuccess(res, { user }, "Profile retrieved.");
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
  sendSuccess(res, { user }, "Profile updated.");
});

export const listAddresses = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await addressesService.listAddresses(req.user!.id);
  sendSuccess(res, { addresses }, "Addresses retrieved.");
});

export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressesService.createAddress(req.user!.id, req.body as AddressInput);
  sendSuccess(res, { address }, "Address created.", 201);
});

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressesService.updateAddress(
    req.user!.id,
    req.params.id,
    req.body as UpdateAddressInput
  );
  sendSuccess(res, { address }, "Address updated.");
});

export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  await addressesService.deleteAddress(req.user!.id, req.params.id);
  sendSuccess(res, null, "Address deleted.");
});

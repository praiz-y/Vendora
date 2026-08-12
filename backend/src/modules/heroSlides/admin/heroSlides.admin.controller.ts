import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { ApiError } from "../../../utils/ApiError";
import * as adminService from "./heroSlides.admin.service";
import type { UpdateHeroSlideInput } from "../heroSlides.validation";

function parsePosition(raw: string): number {
  const position = Number(raw);
  if (!Number.isInteger(position)) throw ApiError.notFound("Hero slide position not found.", "HERO_SLIDE_NOT_FOUND");
  return position;
}

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const slides = await adminService.getHeroSlidesForAdmin();
  sendSuccess(res, { slides }, "Hero slides retrieved.");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const position = parsePosition(req.params.position);
  const slide = await adminService.updateHeroSlideAtPosition(req.user!.id, position, req.body as UpdateHeroSlideInput);
  sendSuccess(res, { slide }, "Hero slide updated.");
});

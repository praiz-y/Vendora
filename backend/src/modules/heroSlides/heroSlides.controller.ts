import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as heroSlidesService from "./heroSlides.service";

export const listHeroSlides = asyncHandler(async (_req: Request, res: Response) => {
  const slides = await heroSlidesService.getPublicHeroSlides();
  sendSuccess(res, { slides }, "Hero slides retrieved.");
});

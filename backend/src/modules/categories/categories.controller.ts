import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as categoriesService from "./categories.service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoriesService.listActiveCategories();
  sendSuccess(res, { categories }, "Categories retrieved.");
});

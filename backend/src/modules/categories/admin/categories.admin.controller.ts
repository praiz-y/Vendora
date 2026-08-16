import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { parsePagination } from "../../../utils/pagination";
import * as adminService from "./categories.admin.service";
import type { ArchiveReasonInput, CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from "../categories.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCategoriesQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { categories, meta } = await adminService.listCategories({ status: query.status, page, limit });
  sendSuccess(res, { categories, meta }, "Categories retrieved.");
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const category = await adminService.createCategory(req.user!.id, req.body as CreateCategoryInput);
  sendSuccess(res, { category }, "Category created.", 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const category = await adminService.updateCategory(req.user!.id, req.params.id, req.body as UpdateCategoryInput);
  sendSuccess(res, { category }, "Category updated.");
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as ArchiveReasonInput;
  const category = await adminService.archiveCategory(req.user!.id, req.params.id, reason);
  sendSuccess(res, { category }, "Category archived.");
});

export const activate = asyncHandler(async (req: Request, res: Response) => {
  const category = await adminService.activateCategory(req.user!.id, req.params.id);
  sendSuccess(res, { category }, "Category activated.");
});

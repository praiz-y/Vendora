import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { parsePagination } from "../../../utils/pagination";
import * as adminService from "./products.admin.service";
import type { ListProductsQuery, RejectProductInput } from "../products.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProductsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { products, meta } = await adminService.listProducts({ status: query.status, page, limit });
  sendSuccess(res, { products, meta }, "Products retrieved.");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const product = await adminService.getProductById(req.params.id);
  sendSuccess(res, { product }, "Product retrieved.");
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const product = await adminService.approveProduct(req.user!.id, req.params.id);
  sendSuccess(res, { product }, "Product approved.");
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as RejectProductInput;
  const product = await adminService.rejectProduct(req.user!.id, req.params.id, reason);
  sendSuccess(res, { product }, "Product rejected.");
});

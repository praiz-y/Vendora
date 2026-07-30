import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { parsePagination } from "../../utils/pagination";
import { getMyStoreId } from "../stores/stores.service";
import * as productsService from "./products.service";
import type { CreateProductInput, DigitalFileInput, ListProductsQuery, UpdateProductInput } from "./products.validation";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const product = await productsService.createProduct(storeId, req.body as CreateProductInput);
  sendSuccess(res, { product }, "Product created.", 201);
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const query = req.query as unknown as ListProductsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { products, meta } = await productsService.listMyProducts(storeId, { status: query.status, page, limit });
  sendSuccess(res, { products, meta }, "Products retrieved.");
});

export const getMine = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const product = await productsService.getMyProduct(storeId, req.params.id);
  sendSuccess(res, { product }, "Product retrieved.");
});

export const updateMine = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const product = await productsService.updateMyProduct(storeId, req.params.id, req.body as UpdateProductInput);
  sendSuccess(res, { product }, "Product updated.");
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const product = await productsService.submitProduct(storeId, req.params.id);
  sendSuccess(res, { product }, "Product submitted for review.");
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const product = await productsService.archiveProduct(storeId, req.params.id);
  sendSuccess(res, { product }, "Product archived.");
});

export const addDigitalVersion = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const product = await productsService.addDigitalVersion(storeId, req.params.id, req.body as DigitalFileInput);
  sendSuccess(res, { product }, "New file version uploaded.", 201);
});

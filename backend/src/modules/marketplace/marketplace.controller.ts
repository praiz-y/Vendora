import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { parsePagination } from "../../utils/pagination";
import * as marketplaceService from "./marketplace.service";
import type {
  ListFeaturedStoresQuery,
  ListPublicProductsQuery,
  RecordProductViewInput,
} from "./marketplace.validation";

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListPublicProductsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { products, meta } = await marketplaceService.listPublicProducts({
    search: query.search,
    categorySlug: query.categorySlug,
    storeSlug: query.storeSlug,
    type: query.type,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sort: query.sort,
    page,
    limit,
  });
  sendSuccess(res, { products, meta }, "Products retrieved.");
});

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await marketplaceService.getPublicProductBySlug(req.params.slug);
  sendSuccess(res, { product }, "Product retrieved.");
});

export const getStoreBySlug = asyncHandler(async (req: Request, res: Response) => {
  const store = await marketplaceService.getPublicStoreBySlug(req.params.slug);
  sendSuccess(res, { store }, "Store retrieved.");
});

export const listFeaturedStores = asyncHandler(async (req: Request, res: Response) => {
  const { limit } = req.query as unknown as ListFeaturedStoresQuery;
  const stores = await marketplaceService.getFeaturedStores(limit);
  sendSuccess(res, { stores }, "Featured stores retrieved.");
});

export const recordView = asyncHandler(async (req: Request, res: Response) => {
  await marketplaceService.recordProductView(req.params.slug, req.user?.id, req.body as RecordProductViewInput);
  sendSuccess(res, {}, "View recorded.");
});

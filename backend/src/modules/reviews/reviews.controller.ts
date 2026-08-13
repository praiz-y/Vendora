import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { parsePagination } from "../../utils/pagination";
import { getMyStoreId } from "../stores/stores.service";
import * as reviewsService from "./reviews.service";
import type { CreateReviewInput, ListProductReviewsQuery } from "./reviews.validation";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewsService.createReview(req.user!.id, req.body as CreateReviewInput);
  sendSuccess(res, { review }, "Review submitted.", 201);
});

export const listForProduct = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProductReviewsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { reviews, meta, summary } = await reviewsService.listProductReviews({ productId: query.productId, page, limit });
  sendSuccess(res, { reviews, meta, summary }, "Reviews retrieved.");
});

export const listMyStoreReviews = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { reviews, meta, summary } = await reviewsService.listMyStoreReviews(storeId, { page, limit });
  sendSuccess(res, { reviews, meta, summary }, "Reviews retrieved.");
});

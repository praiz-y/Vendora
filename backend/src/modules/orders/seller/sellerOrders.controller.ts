import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { parsePagination } from "../../../utils/pagination";
import { getMyStoreId } from "../../stores/stores.service";
import * as sellerOrdersService from "./sellerOrders.service";
import type { ListSellerOrdersQuery, UpdateSellerOrderStatusInput } from "./sellerOrders.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const query = req.query as unknown as ListSellerOrdersQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { sellerOrders, meta } = await sellerOrdersService.listMySellerOrders(storeId, { status: query.status, page, limit });
  sendSuccess(res, { sellerOrders, meta }, "Orders retrieved.");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const sellerOrder = await sellerOrdersService.getMySellerOrder(storeId, req.params.id);
  sendSuccess(res, { sellerOrder }, "Order retrieved.");
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const storeId = await getMyStoreId(req.user!.id);
  const { status } = req.body as UpdateSellerOrderStatusInput;
  const sellerOrder = await sellerOrdersService.updateSellerOrderStatus(storeId, req.params.id, status);
  sendSuccess(res, { sellerOrder }, "Order status updated.");
});

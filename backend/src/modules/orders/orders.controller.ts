import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { parsePagination } from "../../utils/pagination";
import * as ordersService from "./orders.service";
import type { ListOrdersQuery } from "./orders.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListOrdersQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { orders, meta } = await ordersService.listMyOrders(req.user!.id, { status: query.status, page, limit });
  sendSuccess(res, { orders, meta }, "Orders retrieved.");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.getMyOrder(req.user!.id, req.params.id);
  sendSuccess(res, { order }, "Order retrieved.");
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const order = await ordersService.cancelMyOrder(req.user!.id, req.params.id);
  sendSuccess(res, { order }, "Order cancelled.");
});

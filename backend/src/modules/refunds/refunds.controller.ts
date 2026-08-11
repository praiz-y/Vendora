import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { parsePagination } from "../../utils/pagination";
import * as refundsService from "./refunds.service";
import type { CreateRefundInput, ListMyRefundsQuery } from "./refunds.validation";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const refund = await refundsService.requestRefund(req.user!.id, req.body as CreateRefundInput);
  sendSuccess(res, { refund }, "Refund requested.", 201);
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListMyRefundsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { refunds, meta } = await refundsService.listMyRefunds(req.user!.id, { status: query.status, page, limit });
  sendSuccess(res, { refunds, meta }, "Refunds retrieved.");
});

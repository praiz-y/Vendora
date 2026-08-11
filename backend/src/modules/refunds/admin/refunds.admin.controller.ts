import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { parsePagination } from "../../../utils/pagination";
import * as adminService from "./refunds.admin.service";
import type { ListRefundsQuery, RejectRefundInput } from "./refunds.admin.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListRefundsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { refunds, meta } = await adminService.listRefunds({ status: query.status, page, limit });
  sendSuccess(res, { refunds, meta }, "Refunds retrieved.");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const refund = await adminService.getRefundById(req.params.id);
  sendSuccess(res, { refund }, "Refund retrieved.");
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const refund = await adminService.approveRefund(req.user!.id, req.params.id);
  sendSuccess(res, { refund }, "Refund approved and processed.");
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const { reviewNote } = req.body as RejectRefundInput;
  const refund = await adminService.rejectRefund(req.user!.id, req.params.id, reviewNote);
  sendSuccess(res, { refund }, "Refund rejected.");
});

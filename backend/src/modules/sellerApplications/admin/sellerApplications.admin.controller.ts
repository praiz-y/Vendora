import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { parsePagination } from "../../../utils/pagination";
import * as adminService from "./sellerApplications.admin.service";
import type { ListSellerApplicationsQuery, RejectSellerApplicationInput } from "../sellerApplications.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListSellerApplicationsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { applications, meta } = await adminService.listApplications({ status: query.status, page, limit });
  sendSuccess(res, { applications, meta }, "Seller applications retrieved.");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const application = await adminService.getApplicationById(req.params.id);
  sendSuccess(res, { application }, "Seller application retrieved.");
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.approveApplication(req.user!.id, req.params.id);
  sendSuccess(res, result, "Seller application approved.");
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as RejectSellerApplicationInput;
  const application = await adminService.rejectApplication(req.user!.id, req.params.id, reason);
  sendSuccess(res, { application }, "Seller application rejected.");
});

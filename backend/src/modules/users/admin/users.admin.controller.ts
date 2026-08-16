import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { parsePagination } from "../../../utils/pagination";
import * as adminService from "./users.admin.service";
import type { ListUsersQuery, SuspendReasonInput } from "./users.admin.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListUsersQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { users, meta } = await adminService.listUsers({
    role: query.role,
    status: query.status,
    search: query.search,
    page,
    limit,
  });
  sendSuccess(res, { users, meta }, "Users retrieved.");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.getUserById(req.params.id);
  sendSuccess(res, { user }, "User retrieved.");
});

export const suspend = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as SuspendReasonInput;
  const user = await adminService.suspendUser(req.user!.id, req.params.id, reason);
  sendSuccess(res, { user }, "User suspended.");
});

export const reactivate = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.reactivateUser(req.user!.id, req.params.id);
  sendSuccess(res, { user }, "User reactivated.");
});

export const suspendStore = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as SuspendReasonInput;
  const user = await adminService.suspendUserStore(req.user!.id, req.params.id, reason);
  sendSuccess(res, { user }, "Store suspended.");
});

export const reactivateStore = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.reactivateUserStore(req.user!.id, req.params.id);
  sendSuccess(res, { user }, "Store reactivated.");
});

export const featureStore = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.featureUserStore(req.user!.id, req.params.id);
  sendSuccess(res, { user }, "Store featured.");
});

export const unfeatureStore = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.unfeatureUserStore(req.user!.id, req.params.id);
  sendSuccess(res, { user }, "Store unfeatured.");
});

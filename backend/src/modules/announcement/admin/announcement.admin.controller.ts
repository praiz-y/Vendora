import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import * as adminService from "./announcement.admin.service";
import type { UpdateAnnouncementInput } from "../announcement.validation";

export const get = asyncHandler(async (_req: Request, res: Response) => {
  const announcement = await adminService.getAnnouncementForAdmin();
  sendSuccess(res, { announcement }, "Announcement retrieved.");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const announcement = await adminService.upsertAnnouncement(req.user!.id, req.body as UpdateAnnouncementInput);
  sendSuccess(res, { announcement }, "Announcement updated.");
});

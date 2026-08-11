import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as announcementService from "./announcement.service";

export const getAnnouncement = asyncHandler(async (_req: Request, res: Response) => {
  const announcement = await announcementService.getPublicAnnouncement();
  sendSuccess(res, { announcement }, "Announcement retrieved.");
});

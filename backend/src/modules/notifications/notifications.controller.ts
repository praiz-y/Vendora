import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { parsePagination } from "../../utils/pagination";
import * as notificationsService from "./notifications.service";
import type { ListNotificationsQuery } from "./notifications.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListNotificationsQuery;
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const { notifications, meta, unreadCount } = await notificationsService.listMyNotifications(req.user!.id, {
    unreadOnly: query.unreadOnly,
    page,
    limit,
  });
  sendSuccess(res, { notifications, meta, unreadCount }, "Notifications retrieved.");
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationsService.markAsRead(req.user!.id, req.params.id);
  sendSuccess(res, { notification }, "Notification marked as read.");
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.markAllAsRead(req.user!.id);
  sendSuccess(res, {}, "All notifications marked as read.");
});

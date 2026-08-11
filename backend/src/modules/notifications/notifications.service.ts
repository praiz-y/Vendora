import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../utils/pagination";

export interface ListMyNotificationsParams extends PaginationParams {
  unreadOnly?: boolean;
}

export async function listMyNotifications(userId: string, params: ListMyNotificationsParams) {
  const where = { userId, ...(params.unreadOnly ? { isRead: false } : {}) };

  const [notifications, total, unreadCount]: [unknown[], number, number] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" as const }, ...toSkipTake(params) }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, meta: buildPaginationMeta(params, total) as PaginationMeta, unreadCount };
}

export async function markAsRead(userId: string, id: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  // Ownership mismatch reported as the same 404 as a nonexistent id — same
  // pattern as orders/addresses/reviews.
  if (!notification || notification.userId !== userId) {
    throw ApiError.notFound("Notification not found.", "NOTIFICATION_NOT_FOUND");
  }
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

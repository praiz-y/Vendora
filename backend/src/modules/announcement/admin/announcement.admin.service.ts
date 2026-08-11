import { prisma } from "../../../config/prisma";
import { recordAuditLog } from "../../../utils/auditLog";
import { ANNOUNCEMENT_ID } from "../announcement.service";
import type { UpdateAnnouncementInput } from "../announcement.validation";

export async function getAnnouncementForAdmin() {
  return prisma.announcement.findUnique({
    where: { id: ANNOUNCEMENT_ID },
    include: { updatedBy: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function upsertAnnouncement(adminUserId: string, input: UpdateAnnouncementInput) {
  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.upsert({
      where: { id: ANNOUNCEMENT_ID },
      create: { id: ANNOUNCEMENT_ID, message: input.message, enabled: input.enabled, updatedById: adminUserId },
      update: { message: input.message, enabled: input.enabled, updatedById: adminUserId },
      include: { updatedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    await recordAuditLog(tx, {
      actorId: adminUserId,
      action: "ANNOUNCEMENT_UPDATED",
      entityType: "Announcement",
      entityId: String(ANNOUNCEMENT_ID),
    });

    return announcement;
  });
}

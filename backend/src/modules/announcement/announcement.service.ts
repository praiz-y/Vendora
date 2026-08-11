import { prisma } from "../../config/prisma";

// Fixed-id singleton — see schema.prisma's Announcement model comment.
export const ANNOUNCEMENT_ID = 1;

export async function getPublicAnnouncement() {
  const announcement = await prisma.announcement.findUnique({ where: { id: ANNOUNCEMENT_ID } });
  if (!announcement || !announcement.enabled) return null;
  return { message: announcement.message, updatedAt: announcement.updatedAt };
}

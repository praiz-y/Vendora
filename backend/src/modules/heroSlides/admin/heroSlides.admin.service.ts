import { prisma } from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { recordAuditLog } from "../../../utils/auditLog";
import { HERO_SLIDE_POSITIONS } from "../heroSlides.service";
import type { UpdateHeroSlideInput } from "../heroSlides.validation";

function assertValidPosition(position: number): void {
  if (!HERO_SLIDE_POSITIONS.includes(position as (typeof HERO_SLIDE_POSITIONS)[number])) {
    throw ApiError.notFound("Hero slide position not found.", "HERO_SLIDE_NOT_FOUND");
  }
}

export async function getHeroSlidesForAdmin() {
  return prisma.heroSlide.findMany({
    orderBy: { position: "asc" },
    include: { updatedBy: { select: { id: true, firstName: true, lastName: true } } },
  });
}

// Every one of the 4 fixed positions is seeded up front (see seed.ts), so
// this is always effectively an update — the upsert only exists as a
// defensive recovery path if a row were ever somehow missing, mirroring
// announcement.admin.service.ts's own upsert-not-create-blind pattern.
export async function updateHeroSlideAtPosition(adminUserId: string, position: number, input: UpdateHeroSlideInput) {
  assertValidPosition(position);

  return prisma.$transaction(async (tx) => {
    const slide = await tx.heroSlide.upsert({
      where: { position },
      create: { position, ...input, updatedById: adminUserId },
      update: { ...input, updatedById: adminUserId },
      include: { updatedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    await recordAuditLog(tx, {
      actorId: adminUserId,
      action: "HERO_SLIDE_UPDATED",
      entityType: "HeroSlide",
      entityId: slide.id,
    });

    return slide;
  });
}

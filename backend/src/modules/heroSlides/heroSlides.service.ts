import { prisma } from "../../config/prisma";

// The fixed set of 4 positions — seeded once, never created/deleted via the
// API (see schema.prisma's HeroSlide comment).
export const HERO_SLIDE_POSITIONS = [1, 2, 3, 4] as const;

export async function getPublicHeroSlides() {
  const slides = await prisma.heroSlide.findMany({
    where: { enabled: true },
    orderBy: { position: "asc" },
    select: { id: true, position: true, imageUrl: true, headline: true, text: true, ctaLabel: true, ctaUrl: true },
  });
  return slides;
}

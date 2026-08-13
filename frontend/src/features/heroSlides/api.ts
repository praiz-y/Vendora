import { apiClient } from "@/lib/api/client";

export interface PublicHeroSlide {
  id: string;
  position: number;
  imageUrl: string;
  headline: string;
  text: string;
  ctaLabel: string;
  ctaUrl: string;
}

export const heroSlidesApi = {
  list: () => apiClient.get<{ slides: PublicHeroSlide[] }>("/api/v1/hero-slides"),
};

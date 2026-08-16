import { apiClient } from "@/lib/api/client";

export interface AdminHeroSlide {
  id: string;
  position: number;
  imageUrl: string;
  headline: string;
  text: string;
  ctaLabel: string;
  ctaUrl: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface UpdateHeroSlideInput {
  imageUrl: string;
  headline: string;
  text: string;
  ctaLabel: string;
  ctaUrl: string;
  enabled: boolean;
}

export const adminHeroSlidesApi = {
  list: () => apiClient.get<{ slides: AdminHeroSlide[] }>("/api/v1/admin/hero-slides"),
  update: (position: number, input: UpdateHeroSlideInput) =>
    apiClient.put<{ slide: AdminHeroSlide }>(`/api/v1/admin/hero-slides/${position}`, input),
};

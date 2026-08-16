"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminHeroSlidesApi, type UpdateHeroSlideInput } from "./api";

const KEY = ["admin", "hero-slides"];

export function useAdminHeroSlides() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => adminHeroSlidesApi.list(),
    select: (data) => data.slides,
  });
}

export function useUpdateHeroSlide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ position, input }: { position: number; input: UpdateHeroSlideInput }) =>
      adminHeroSlidesApi.update(position, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

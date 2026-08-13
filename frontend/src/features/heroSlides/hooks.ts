"use client";

import { useQuery } from "@tanstack/react-query";
import { heroSlidesApi } from "./api";

export function useHeroSlides() {
  return useQuery({
    queryKey: ["heroSlides"],
    queryFn: () => heroSlidesApi.list(),
    select: (data) => data.slides,
    staleTime: 60_000,
  });
}

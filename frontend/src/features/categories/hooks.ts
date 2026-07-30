"use client";

import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "./api";

export function useActiveCategories() {
  return useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoriesApi.listActive(),
    select: (data) => data.categories,
    staleTime: 5 * 60 * 1000,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { announcementApi } from "./api";

export function useAnnouncement() {
  return useQuery({
    queryKey: ["announcement"],
    queryFn: () => announcementApi.get(),
    select: (data) => data.announcement,
    staleTime: 60_000,
  });
}

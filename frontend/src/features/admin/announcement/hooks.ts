"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAnnouncementApi, type UpdateAnnouncementInput } from "./api";

const KEY = ["admin", "announcement"];

export function useAdminAnnouncement() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => adminAnnouncementApi.get(),
    select: (data) => data.announcement,
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAnnouncementInput) => adminAnnouncementApi.update(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

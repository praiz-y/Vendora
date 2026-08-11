"use client";

import { useQuery } from "@tanstack/react-query";
import { adminDashboardApi } from "./api";

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-dashboard", "overview"],
    queryFn: () => adminDashboardApi.getOverview(),
    select: (data) => data.overview,
  });
}

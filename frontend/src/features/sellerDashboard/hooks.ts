"use client";

import { useQuery } from "@tanstack/react-query";
import { sellerDashboardApi } from "./api";

export function useSellerOverview() {
  return useQuery({
    queryKey: ["seller-dashboard", "overview"],
    queryFn: () => sellerDashboardApi.getOverview(),
    select: (data) => data.overview,
  });
}

export function useSellerAnalytics() {
  return useQuery({
    queryKey: ["seller-dashboard", "analytics"],
    queryFn: () => sellerDashboardApi.getAnalytics(),
    select: (data) => data.analytics,
  });
}

import { apiClient } from "@/lib/api/client";
import type { SellerAnalytics, SellerOverview } from "@/types/sellerDashboard";

export const sellerDashboardApi = {
  getOverview: () => apiClient.get<{ overview: SellerOverview }>("/api/v1/seller-dashboard/overview"),
  getAnalytics: () => apiClient.get<{ analytics: SellerAnalytics }>("/api/v1/seller-dashboard/analytics"),
};

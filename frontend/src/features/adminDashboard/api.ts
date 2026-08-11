import { apiClient } from "@/lib/api/client";
import type { AdminOverview } from "@/types/adminDashboard";

export const adminDashboardApi = {
  getOverview: () => apiClient.get<{ overview: AdminOverview }>("/api/v1/admin-dashboard/overview"),
};

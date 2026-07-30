import { apiClient } from "@/lib/api/client";
import type { DigitalDownload, DigitalEntitlement } from "@/types/entitlement";

export const entitlementsApi = {
  list: () => apiClient.get<{ entitlements: DigitalEntitlement[] }>("/api/v1/entitlements"),
  getDownload: (productId: string) =>
    apiClient.get<{ download: DigitalDownload }>(`/api/v1/entitlements/${productId}/download`),
};

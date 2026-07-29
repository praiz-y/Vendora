import { apiClient } from "@/lib/api/client";
import type { Store } from "@/types/store";

export interface StoreProfileInput {
  name?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  businessCategory?: string;
  phone?: string;
  email?: string;
  location?: string;
  businessRegistration?: string;
}

export const storesApi = {
  getMine: () => apiClient.get<{ store: Store }>("/api/v1/stores/me"),
  updateMine: (input: StoreProfileInput) => apiClient.patch<{ store: Store }>("/api/v1/stores/me", input),
};

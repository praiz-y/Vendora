import { apiClient } from "@/lib/api/client";
import type { SellerApplication } from "@/types/store";

export interface SellerApplicationFormInput {
  storeName: string;
  storeDescription: string;
  storeLogoUrl?: string;
  storeBannerUrl?: string;
  businessCategory: string;
  phone: string;
  email: string;
  location: string;
  businessRegistration?: string;
}

export const sellerApplicationsApi = {
  getMine: () => apiClient.get<{ application: SellerApplication }>("/api/v1/seller-applications/me"),
  submit: (input: SellerApplicationFormInput) =>
    apiClient.post<{ application: SellerApplication }>("/api/v1/seller-applications", input),
  updateMine: (input: Partial<SellerApplicationFormInput>) =>
    apiClient.patch<{ application: SellerApplication }>("/api/v1/seller-applications/me", input),
};

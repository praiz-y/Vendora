import { apiClient } from "@/lib/api/client";
import type { Address, SafeUser } from "@/types/user";

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface AddressInput {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export const usersApi = {
  getMe: () => apiClient.get<{ user: SafeUser }>("/api/v1/users/me"),
  updateMe: (input: UpdateProfileInput) => apiClient.patch<{ user: SafeUser }>("/api/v1/users/me", input),
  listAddresses: () => apiClient.get<{ addresses: Address[] }>("/api/v1/users/me/addresses"),
  createAddress: (input: AddressInput) =>
    apiClient.post<{ address: Address }>("/api/v1/users/me/addresses", input),
  updateAddress: (id: string, input: Partial<AddressInput>) =>
    apiClient.patch<{ address: Address }>(`/api/v1/users/me/addresses/${id}`, input),
  deleteAddress: (id: string) => apiClient.delete<null>(`/api/v1/users/me/addresses/${id}`),
};

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { usersApi, type AddressInput, type UpdateProfileInput } from "./api";

export function useUpdateProfile() {
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => usersApi.updateMe(input),
    onSuccess: (data) => updateUser(data.user),
  });
}

// Re-fetches /users/me and pushes the result into the auth store. Used where
// the session's `seller` snapshot can go stale mid-visit — e.g. a seller
// application getting approved while its status page is open — without
// forcing a full re-login just to pick up the new capability.
export function useRefreshSession() {
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: () => usersApi.getMe(),
    onSuccess: (data) => updateUser(data.user),
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: () => usersApi.listAddresses(),
    select: (data) => data.addresses,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddressInput) => usersApi.createAddress(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AddressInput> }) =>
      usersApi.updateAddress(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi, type AdminUsersListParams } from "./api";

const LIST_KEY = ["admin", "users"];

export function useAdminUsers(params: AdminUsersListParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => adminUsersApi.list(params),
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => adminUsersApi.getById(id),
    select: (data) => data.user,
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.suspend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.reactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useSuspendUserStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.suspendStore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useReactivateUserStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.reactivateStore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

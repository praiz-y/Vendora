"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { toast } from "@/stores/toastStore";
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
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminUsersApi.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Account suspended.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Account reactivated.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useSuspendUserStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminUsersApi.suspendStore(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Store suspended.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useReactivateUserStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.reactivateStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Store reactivated.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useFeatureUserStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.featureStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Store featured.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUnfeatureUserStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.unfeatureStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Store unfeatured.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

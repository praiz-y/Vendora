"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminSellerApplicationsApi, type AdminSellerApplicationsListParams } from "./api";

const LIST_KEY = ["admin", "seller-applications"];

export function useAdminSellerApplications(params: AdminSellerApplicationsListParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => adminSellerApplicationsApi.list(params),
  });
}

export function useAdminSellerApplication(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => adminSellerApplicationsApi.getById(id),
    select: (data) => data.application,
  });
}

export function useApproveSellerApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSellerApplicationsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useRejectSellerApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminSellerApplicationsApi.reject(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

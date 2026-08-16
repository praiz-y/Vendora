"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { toast } from "@/stores/toastStore";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Application approved.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRejectSellerApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminSellerApplicationsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Application rejected.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

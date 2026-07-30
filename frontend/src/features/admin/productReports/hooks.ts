"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminProductReportsApi, type AdminProductReportsListParams } from "./api";

const LIST_KEY = ["admin", "product-reports"];

export function useAdminProductReports(params: AdminProductReportsListParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => adminProductReportsApi.list(params),
  });
}

export function useAdminProductReport(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => adminProductReportsApi.getById(id),
    select: (data) => data.report,
  });
}

export function useResolveProductReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolutionNote }: { id: string; resolutionNote?: string }) =>
      adminProductReportsApi.resolve(id, resolutionNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDismissProductReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolutionNote }: { id: string; resolutionNote?: string }) =>
      adminProductReportsApi.dismiss(id, resolutionNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

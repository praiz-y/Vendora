"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { toast } from "@/stores/toastStore";
import { adminProductReportsApi, type AdminProductReportsListParams } from "./api";

const LIST_KEY = ["admin", "product-reports"];

function reportBulkResult(results: PromiseSettledResult<unknown>[], verb: string) {
  const failed = results.filter((r) => r.status === "rejected").length;
  const succeeded = results.length - failed;
  if (failed === 0) toast.success(`${succeeded} report${succeeded === 1 ? "" : "s"} ${verb}.`);
  else toast.error(`${succeeded} ${verb}, ${failed} failed.`);
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Report resolved.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDismissProductReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolutionNote }: { id: string; resolutionNote?: string }) =>
      adminProductReportsApi.dismiss(id, resolutionNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Report dismissed.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkResolveProductReports() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map((id) => adminProductReportsApi.resolve(id))),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      reportBulkResult(results, "resolved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkDismissProductReports() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, resolutionNote }: { ids: string[]; resolutionNote: string }) =>
      Promise.allSettled(ids.map((id) => adminProductReportsApi.dismiss(id, resolutionNote))),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      reportBulkResult(results, "dismissed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

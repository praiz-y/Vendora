"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { toast } from "@/stores/toastStore";
import { adminProductsApi, type AdminProductsListParams } from "./api";

const LIST_KEY = ["admin", "products"];

function reportBulkResult(results: PromiseSettledResult<unknown>[], verb: string) {
  const failed = results.filter((r) => r.status === "rejected").length;
  const succeeded = results.length - failed;
  if (failed === 0) toast.success(`${succeeded} product${succeeded === 1 ? "" : "s"} ${verb}.`);
  else toast.error(`${succeeded} ${verb}, ${failed} failed.`);
}

export function useAdminProducts(params: AdminProductsListParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => adminProductsApi.list(params),
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => adminProductsApi.getById(id),
    select: (data) => data.product,
  });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProductsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Product approved.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRejectProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminProductsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      toast.success("Product rejected.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkApproveProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map((id) => adminProductsApi.approve(id))),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      reportBulkResult(results, "approved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkRejectProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason: string }) =>
      Promise.allSettled(ids.map((id) => adminProductsApi.reject(id, reason))),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      reportBulkResult(results, "rejected");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

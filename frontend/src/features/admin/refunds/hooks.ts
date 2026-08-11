"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminRefundsApi, type AdminRefundsListParams } from "./api";

const LIST_KEY = ["admin", "refunds"];

export function useAdminRefunds(params: AdminRefundsListParams) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => adminRefundsApi.list(params),
  });
}

export function useAdminRefund(id: string) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => adminRefundsApi.getById(id),
    select: (data) => data.refund,
  });
}

export function useApproveRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminRefundsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useRejectRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) => adminRefundsApi.reject(id, reviewNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

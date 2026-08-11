"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { refundsApi, type CreateRefundInput, type ListMyRefundsParams } from "./api";

export function useMyRefunds(params: ListMyRefundsParams = {}) {
  return useQuery({
    queryKey: ["refunds", "me", params],
    queryFn: () => refundsApi.listMine(params),
  });
}

export function useRequestRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRefundInput) => refundsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
    },
  });
}

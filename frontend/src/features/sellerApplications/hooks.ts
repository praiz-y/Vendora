"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sellerApplicationsApi, type SellerApplicationFormInput } from "./api";

const QUERY_KEY = ["seller-application", "me"];

export function useMyApplication() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => sellerApplicationsApi.getMine(),
    select: (data) => data.application,
    // A 404 here just means "hasn't applied yet" — a normal, expected
    // outcome, not a transient failure worth retrying.
    retry: false,
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SellerApplicationFormInput) => sellerApplicationsApi.submit(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateMyApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SellerApplicationFormInput>) => sellerApplicationsApi.updateMine(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storesApi, type StoreProfileInput } from "./api";

const QUERY_KEY = ["store", "me"];

export function useMyStore() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => storesApi.getMine(),
    select: (data) => data.store,
  });
}

export function useUpdateMyStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreProfileInput) => storesApi.updateMine(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

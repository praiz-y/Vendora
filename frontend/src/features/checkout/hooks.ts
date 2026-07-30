"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkoutApi, type CheckoutInput } from "./api";

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) => checkoutApi.checkout(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useRetryPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, simulateFailure }: { orderId: string; simulateFailure?: boolean }) =>
      checkoutApi.retryPayment(orderId, simulateFailure),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}

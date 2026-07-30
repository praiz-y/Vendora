import { apiClient } from "@/lib/api/client";
import type { Order } from "@/types/order";

export interface CheckoutInput {
  shippingAddressId?: string;
  simulateFailure?: boolean;
}

export const checkoutApi = {
  checkout: (input: CheckoutInput) => apiClient.post<{ order: Order }>("/api/v1/checkout", input),
  retryPayment: (orderId: string, simulateFailure?: boolean) =>
    apiClient.post<{ order: Order }>(`/api/v1/checkout/${orderId}/retry-payment`, { simulateFailure }),
};

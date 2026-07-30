import { z } from "zod";

export const checkoutSchema = z.object({
  shippingAddressId: z.string().trim().min(1).optional(),
  // See paymentGateway.service.ts — test-only, gone once a real provider replaces the simulation.
  simulateFailure: z.boolean().optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const retryPaymentSchema = z.object({
  simulateFailure: z.boolean().optional(),
});
export type RetryPaymentInput = z.infer<typeof retryPaymentSchema>;

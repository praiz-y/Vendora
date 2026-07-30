import { randomBytes } from "node:crypto";

// Stands in for a real payment provider (Paystack, per the roadmap) until
// one is wired in. Resolves synchronously and deterministically — no
// network call, no redirect/webhook round-trip — because there's nothing
// real to call. `checkout.service.ts` is written against this exact shape
// (amount/currency in, {status, providerReference, rawResponse} out) so
// swapping in a real provider later means writing a new module with this
// same interface, not touching the checkout flow itself.
export const PROVIDER_NAME = "simulated";

export interface ChargeInput {
  amount: string;
  currency: string;
  // Test-only escape hatch so the failure path (Payment FAILED, stock
  // reservations released, cart left intact for retry) is actually
  // demonstrable without a real declined card. Has no effect once a real
  // provider replaces this module — remove it then.
  simulateFailure?: boolean;
}

export interface ChargeResult {
  status: "SUCCESS" | "FAILED";
  providerReference: string;
  rawResponse: Record<string, unknown>;
}

export async function charge(input: ChargeInput): Promise<ChargeResult> {
  const providerReference = `sim_${randomBytes(12).toString("hex")}`;

  if (input.simulateFailure) {
    return {
      status: "FAILED",
      providerReference,
      rawResponse: { simulated: true, amount: input.amount, currency: input.currency, reason: "Simulated failure (test)" },
    };
  }

  return {
    status: "SUCCESS",
    providerReference,
    rawResponse: { simulated: true, amount: input.amount, currency: input.currency },
  };
}

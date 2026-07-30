import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as checkoutService from "./checkout.service";
import type { CheckoutInput, RetryPaymentInput } from "./checkout.validation";

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const order = await checkoutService.checkout(req.user!.id, req.body as CheckoutInput);
  sendSuccess(res, { order }, order.status === "PAID" ? "Payment successful — order placed." : "Payment failed.", 201);
});

export const retryPayment = asyncHandler(async (req: Request, res: Response) => {
  const order = await checkoutService.retryPayment(req.user!.id, req.params.orderId, req.body as RetryPaymentInput);
  sendSuccess(res, { order }, order.status === "PAID" ? "Payment successful — order placed." : "Payment failed.");
});

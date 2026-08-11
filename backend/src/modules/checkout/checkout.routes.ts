import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { writeRateLimiter } from "../../middlewares/rateLimiter";
import { validate } from "../../middlewares/validate";
import * as checkoutController from "./checkout.controller";
import { checkoutSchema, retryPaymentSchema } from "./checkout.validation";

const router = Router();

router.use(authenticate, writeRateLimiter);

router.post("/", validate(checkoutSchema), checkoutController.checkout);
router.post("/:orderId/retry-payment", validate(retryPaymentSchema), checkoutController.retryPayment);

export default router;

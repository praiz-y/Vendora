import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { writeRateLimiter } from "../../middlewares/rateLimiter";
import { validate } from "../../middlewares/validate";
import * as refundsController from "./refunds.controller";
import { createRefundSchema, listMyRefundsQuerySchema } from "./refunds.validation";

const router = Router();

router.use(authenticate);

router.post("/", writeRateLimiter, validate(createRefundSchema), refundsController.create);
router.get("/me", validate(listMyRefundsQuerySchema, "query"), refundsController.listMine);

export default router;

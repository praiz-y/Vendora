import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireActiveSeller } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as sellerOrdersController from "./sellerOrders.controller";
import { listSellerOrdersQuerySchema, updateSellerOrderStatusSchema } from "./sellerOrders.validation";

const router = Router();

router.use(authenticate, requireActiveSeller);

router.get("/", validate(listSellerOrdersQuerySchema, "query"), sellerOrdersController.list);
router.get("/:id", sellerOrdersController.getById);
router.patch("/:id/status", validate(updateSellerOrderStatusSchema), sellerOrdersController.updateStatus);

export default router;

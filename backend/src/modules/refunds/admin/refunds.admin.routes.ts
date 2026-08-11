import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as adminController from "./refunds.admin.controller";
import { listRefundsQuerySchema, rejectRefundSchema } from "./refunds.admin.validation";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validate(listRefundsQuerySchema, "query"), adminController.list);
router.get("/:id", adminController.getById);
router.post("/:id/approve", adminController.approve);
router.post("/:id/reject", validate(rejectRefundSchema), adminController.reject);

export default router;

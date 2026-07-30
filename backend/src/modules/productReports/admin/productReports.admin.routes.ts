import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as adminController from "./productReports.admin.controller";
import { listProductReportsQuerySchema, resolveProductReportSchema } from "../productReports.validation";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validate(listProductReportsQuerySchema, "query"), adminController.list);
router.get("/:id", adminController.getById);
router.post("/:id/resolve", validate(resolveProductReportSchema), adminController.resolve);
router.post("/:id/dismiss", validate(resolveProductReportSchema), adminController.dismiss);

export default router;

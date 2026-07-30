import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as adminController from "./products.admin.controller";
import { listProductsQuerySchema, rejectProductSchema } from "../products.validation";

const router = Router();

// Second consumer of the Admin Foundation's list/detail/approve-reject
// pattern (docs/roadmap.md Phase 3/4) after seller-application review.
router.use(authenticate, requireAdmin);

router.get("/", validate(listProductsQuerySchema, "query"), adminController.list);
router.get("/:id", adminController.getById);
router.post("/:id/approve", adminController.approve);
router.post("/:id/reject", validate(rejectProductSchema), adminController.reject);

export default router;

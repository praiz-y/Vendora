import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as adminController from "./sellerApplications.admin.controller";
import { listSellerApplicationsQuerySchema, rejectSellerApplicationSchema } from "../sellerApplications.validation";

const router = Router();

// First screen built against the Admin Foundation's shared
// list/detail/approve-reject pattern (see docs/roadmap.md Phase 3). Every
// later admin-touching phase (product moderation, reports, refunds) follows
// this same shape.
router.use(authenticate, requireAdmin);

router.get("/", validate(listSellerApplicationsQuerySchema, "query"), adminController.list);
router.get("/:id", adminController.getById);
router.post("/:id/approve", adminController.approve);
router.post("/:id/reject", validate(rejectSellerApplicationSchema), adminController.reject);

export default router;

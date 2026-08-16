import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as adminController from "./users.admin.controller";
import { listUsersQuerySchema, suspendReasonSchema } from "./users.admin.validation";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validate(listUsersQuerySchema, "query"), adminController.list);
router.get("/:id", adminController.getById);
router.post("/:id/suspend", validate(suspendReasonSchema), adminController.suspend);
router.post("/:id/reactivate", adminController.reactivate);
router.post("/:id/store/suspend", validate(suspendReasonSchema), adminController.suspendStore);
router.post("/:id/store/reactivate", adminController.reactivateStore);
router.post("/:id/store/feature", adminController.featureStore);
router.post("/:id/store/unfeature", adminController.unfeatureStore);

export default router;

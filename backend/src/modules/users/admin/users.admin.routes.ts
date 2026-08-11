import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as adminController from "./users.admin.controller";
import { listUsersQuerySchema } from "./users.admin.validation";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validate(listUsersQuerySchema, "query"), adminController.list);
router.get("/:id", adminController.getById);
router.post("/:id/suspend", adminController.suspend);
router.post("/:id/reactivate", adminController.reactivate);
router.post("/:id/store/suspend", adminController.suspendStore);
router.post("/:id/store/reactivate", adminController.reactivateStore);

export default router;

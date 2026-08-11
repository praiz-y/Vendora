import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as adminController from "./announcement.admin.controller";
import { updateAnnouncementSchema } from "../announcement.validation";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", adminController.get);
router.put("/", validate(updateAnnouncementSchema), adminController.update);

export default router;

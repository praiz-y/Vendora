import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as adminController from "./heroSlides.admin.controller";
import { updateHeroSlideSchema } from "../heroSlides.validation";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", adminController.list);
router.put("/:position", validate(updateHeroSlideSchema), adminController.update);

export default router;

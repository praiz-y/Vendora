import { Router } from "express";
import * as heroSlidesController from "./heroSlides.controller";

const router = Router();

// Public — every visitor sees the enabled slides. Admin read/write (all 4,
// including disabled) lives in admin/heroSlides.admin.routes.ts.
router.get("/", heroSlidesController.listHeroSlides);

export default router;

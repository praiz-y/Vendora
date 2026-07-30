import { Router } from "express";
import { authenticate } from "../../../middlewares/authenticate";
import { requireAdmin } from "../../../middlewares/authorize";
import { validate } from "../../../middlewares/validate";
import * as adminController from "./categories.admin.controller";
import { createCategorySchema, listCategoriesQuerySchema, updateCategorySchema } from "../categories.validation";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validate(listCategoriesQuerySchema, "query"), adminController.list);
router.post("/", validate(createCategorySchema), adminController.create);
router.patch("/:id", validate(updateCategorySchema), adminController.update);
router.post("/:id/archive", adminController.archive);
router.post("/:id/activate", adminController.activate);

export default router;

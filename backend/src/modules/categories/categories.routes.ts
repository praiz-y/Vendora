import { Router } from "express";
import * as categoriesController from "./categories.controller";

const router = Router();

// Public since Phase 5: anonymous buyers browsing the marketplace need to
// see category names (nav, filters) without logging in. Nothing here is
// sensitive — full admin CRUD (including archived categories) stays behind
// requireAdmin in admin/categories.admin.routes.ts.
router.get("/", categoriesController.list);

export default router;

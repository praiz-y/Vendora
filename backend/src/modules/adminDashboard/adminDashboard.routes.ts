import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireAdmin } from "../../middlewares/authorize";
import * as adminDashboardController from "./adminDashboard.controller";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/overview", adminDashboardController.getOverview);

export default router;

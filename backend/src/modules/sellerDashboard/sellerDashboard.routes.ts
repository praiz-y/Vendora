import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireActiveSeller } from "../../middlewares/authorize";
import * as sellerDashboardController from "./sellerDashboard.controller";

const router = Router();

router.use(authenticate, requireActiveSeller);

router.get("/overview", sellerDashboardController.getOverview);
router.get("/analytics", sellerDashboardController.getAnalytics);

export default router;

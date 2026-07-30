import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import * as entitlementsController from "./entitlements.controller";

const router = Router();

router.use(authenticate);

router.get("/", entitlementsController.list);
router.get("/:productId/download", entitlementsController.getDownload);

export default router;

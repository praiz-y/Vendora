import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireActiveSeller } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import * as storesController from "./stores.controller";
import { updateStoreSchema } from "./stores.validation";

const router = Router();

// A suspended seller loses store management along with everything else
// seller-related — requireActiveSeller re-checks Store.status live on every
// request, so a suspension takes effect immediately, not on next login.
router.use(authenticate, requireActiveSeller);

router.get("/me", storesController.getMyStore);
router.patch("/me", validate(updateStoreSchema), storesController.updateMyStore);

export default router;

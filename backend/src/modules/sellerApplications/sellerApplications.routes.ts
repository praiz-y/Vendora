import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as sellerApplicationsController from "./sellerApplications.controller";
import { sellerApplicationSchema, updateSellerApplicationSchema } from "./sellerApplications.validation";

const router = Router();

router.use(authenticate);

router.post("/", validate(sellerApplicationSchema), sellerApplicationsController.submit);
router.get("/me", sellerApplicationsController.getMine);
router.patch("/me", validate(updateSellerApplicationSchema), sellerApplicationsController.updateMine);

export default router;

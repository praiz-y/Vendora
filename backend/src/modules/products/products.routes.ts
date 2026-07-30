import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireActiveSeller } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import * as productsController from "./products.controller";
import { createProductSchema, digitalFileSchema, listProductsQuerySchema, updateProductSchema } from "./products.validation";

const router = Router();

// Public product browsing/detail pages are Phase 5 (Marketplace + Discovery)
// — every route here is the seller's own product management, gated the same
// way stores.routes.ts is.
router.use(authenticate, requireActiveSeller);

router.post("/", validate(createProductSchema), productsController.create);
router.get("/me", validate(listProductsQuerySchema, "query"), productsController.listMine);
router.get("/me/:id", productsController.getMine);
router.patch("/me/:id", validate(updateProductSchema), productsController.updateMine);
router.post("/me/:id/submit", productsController.submit);
router.post("/me/:id/archive", productsController.archive);
router.post("/me/:id/digital-versions", validate(digitalFileSchema), productsController.addDigitalVersion);

export default router;

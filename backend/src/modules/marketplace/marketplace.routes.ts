import { Router } from "express";
import { validate } from "../../middlewares/validate";
import * as marketplaceController from "./marketplace.controller";
import { listPublicProductsQuerySchema } from "./marketplace.validation";

const router = Router();

// Fully public — no authenticate(). This is the one module in the app
// deliberately reachable by anonymous buyers, per Phase 5's charter.
router.get("/products", validate(listPublicProductsQuerySchema, "query"), marketplaceController.listProducts);
router.get("/products/:slug", marketplaceController.getProductBySlug);
router.get("/stores/:slug", marketplaceController.getStoreBySlug);

export default router;

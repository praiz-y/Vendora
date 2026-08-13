import { Router } from "express";
import { optionalAuthenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as marketplaceController from "./marketplace.controller";
import {
  listFeaturedStoresQuerySchema,
  listPublicProductsQuerySchema,
  recordProductViewSchema,
} from "./marketplace.validation";

const router = Router();

// Fully public — no authenticate(). This is the one module in the app
// deliberately reachable by anonymous buyers, per Phase 5's charter.
router.get("/products", validate(listPublicProductsQuerySchema, "query"), marketplaceController.listProducts);
router.get("/products/:slug", marketplaceController.getProductBySlug);
// Registered before /stores/:slug — otherwise Express would match
// "featured" as a :slug value and this would never be reached.
router.get(
  "/stores/featured",
  validate(listFeaturedStoresQuerySchema, "query"),
  marketplaceController.listFeaturedStores
);
router.get("/stores/:slug", marketplaceController.getStoreBySlug);
// optionalAuthenticate (not authenticate): an anonymous view still counts,
// it just records against visitorId instead of userId (Phase 11 analytics).
router.post(
  "/products/:slug/view",
  optionalAuthenticate,
  validate(recordProductViewSchema),
  marketplaceController.recordView
);

export default router;

import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireActiveSeller } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import * as reviewsController from "./reviews.controller";
import { createReviewSchema, listProductReviewsQuerySchema } from "./reviews.validation";

const router = Router();

// Public — anyone can read a product's reviews, same charter as Phase 5's
// marketplace module.
router.get("/", validate(listProductReviewsQuerySchema, "query"), reviewsController.listForProduct);

// Fills in Phase 3's Seller Dashboard "Reviews" placeholder.
router.get("/me/store", authenticate, requireActiveSeller, reviewsController.listMyStoreReviews);

router.post("/", authenticate, validate(createReviewSchema), reviewsController.create);

export default router;

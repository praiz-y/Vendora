import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as wishlistController from "./wishlist.controller";
import { addWishlistItemSchema } from "./wishlist.validation";

const router = Router();

router.use(authenticate);

router.get("/", wishlistController.getWishlist);
router.post("/items", validate(addWishlistItemSchema), wishlistController.addItem);
router.delete("/items/:id", wishlistController.removeItem);
router.post("/items/:id/move-to-cart", wishlistController.moveToCart);

export default router;

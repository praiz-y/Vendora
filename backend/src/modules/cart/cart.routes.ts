import { Router } from "express";
import { optionalAuthenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as cartController from "./cart.controller";
import { resolveCart } from "./cart.middleware";
import { addCartItemSchema, updateCartItemSchema } from "./cart.validation";

const router = Router();

// Overhaul Phase 3: guests can build a cart anonymously, login is only
// required at checkout — optionalAuthenticate leaves req.user undefined for
// a guest instead of rejecting; resolveCart then finds-or-creates the right
// Cart row either way (the user's own, or a cookie-identified guest cart).
router.use(optionalAuthenticate, resolveCart);

router.get("/", cartController.getCart);
router.post("/items", validate(addCartItemSchema), cartController.addItem);
router.patch("/items/:id", validate(updateCartItemSchema), cartController.updateItem);
router.delete("/items/:id", cartController.removeItem);

export default router;

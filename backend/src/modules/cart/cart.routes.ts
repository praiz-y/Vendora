import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as cartController from "./cart.controller";
import { addCartItemSchema, updateCartItemSchema } from "./cart.validation";

const router = Router();

// Any authenticated buyer — not seller-gated. Every user (buyer or seller)
// gets a cart at registration (auth.service.ts register()).
router.use(authenticate);

router.get("/", cartController.getCart);
router.post("/items", validate(addCartItemSchema), cartController.addItem);
router.patch("/items/:id", validate(updateCartItemSchema), cartController.updateItem);
router.delete("/items/:id", cartController.removeItem);

export default router;

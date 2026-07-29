import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as usersController from "./users.controller";
import { addressSchema, updateAddressSchema, updateProfileSchema } from "./users.validation";

const router = Router();

router.use(authenticate);

router.get("/me", usersController.getMe);
router.patch("/me", validate(updateProfileSchema), usersController.updateMe);

router.get("/me/addresses", usersController.listAddresses);
router.post("/me/addresses", validate(addressSchema), usersController.createAddress);
router.patch("/me/addresses/:id", validate(updateAddressSchema), usersController.updateAddress);
router.delete("/me/addresses/:id", usersController.deleteAddress);

export default router;

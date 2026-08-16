import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as uploadsController from "./uploads.controller";
import { signUploadSchema } from "./uploads.validation";

const router = Router();

router.use(authenticate);

router.post("/sign", validate(signUploadSchema), uploadsController.sign);

export default router;

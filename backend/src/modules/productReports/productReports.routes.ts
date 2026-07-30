import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as productReportsController from "./productReports.controller";
import { createProductReportSchema } from "./productReports.validation";

const router = Router();

router.use(authenticate);

router.post("/", validate(createProductReportSchema), productReportsController.create);

export default router;

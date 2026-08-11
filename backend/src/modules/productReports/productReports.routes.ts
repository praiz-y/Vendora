import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { writeRateLimiter } from "../../middlewares/rateLimiter";
import { validate } from "../../middlewares/validate";
import * as productReportsController from "./productReports.controller";
import { createProductReportSchema } from "./productReports.validation";

const router = Router();

router.use(authenticate);

router.post("/", writeRateLimiter, validate(createProductReportSchema), productReportsController.create);

export default router;

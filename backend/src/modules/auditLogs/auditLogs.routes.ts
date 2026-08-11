import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireAdmin } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import * as auditLogsController from "./auditLogs.controller";
import { listAuditLogsQuerySchema } from "./auditLogs.validation";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", validate(listAuditLogsQuerySchema, "query"), auditLogsController.list);

export default router;

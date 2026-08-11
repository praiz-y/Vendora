import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as notificationsController from "./notifications.controller";
import { listNotificationsQuerySchema } from "./notifications.validation";

const router = Router();

router.use(authenticate);

router.get("/", validate(listNotificationsQuerySchema, "query"), notificationsController.list);
router.post("/read-all", notificationsController.markAllAsRead);
router.post("/:id/read", notificationsController.markAsRead);

export default router;

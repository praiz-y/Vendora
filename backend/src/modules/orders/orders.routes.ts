import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as ordersController from "./orders.controller";
import { listOrdersQuerySchema } from "./orders.validation";

const router = Router();

router.use(authenticate);

router.get("/", validate(listOrdersQuerySchema, "query"), ordersController.list);
router.get("/:id", ordersController.getById);
router.post("/:id/cancel", ordersController.cancel);

export default router;

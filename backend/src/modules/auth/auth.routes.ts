import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authRateLimiter, writeRateLimiter } from "../../middlewares/rateLimiter";
import { validate } from "../../middlewares/validate";
import * as authController from "./auth.controller";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.validation";

const router = Router();

router.post("/register", authRateLimiter, validate(registerSchema), authController.register);
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authRateLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.get("/me", authenticate, authController.me);
router.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post(
  "/change-password",
  authenticate,
  writeRateLimiter,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;

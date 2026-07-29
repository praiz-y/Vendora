import { Router } from "express";
import healthRoutes from "../../modules/health/health.routes";
import authRoutes from "../../modules/auth/auth.routes";
import usersRoutes from "../../modules/users/users.routes";
import sellerApplicationsRoutes from "../../modules/sellerApplications/sellerApplications.routes";
import adminSellerApplicationsRoutes from "../../modules/sellerApplications/admin/sellerApplications.admin.routes";
import storesRoutes from "../../modules/stores/stores.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/seller-applications", sellerApplicationsRoutes);
router.use("/admin/seller-applications", adminSellerApplicationsRoutes);
router.use("/stores", storesRoutes);

export default router;

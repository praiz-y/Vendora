import { Router } from "express";
import * as announcementController from "./announcement.controller";

const router = Router();

// Public — the marquee bar renders for every visitor, logged in or not.
// Full read/write for the admin form lives in admin/announcement.admin.routes.ts.
router.get("/", announcementController.getAnnouncement);

export default router;

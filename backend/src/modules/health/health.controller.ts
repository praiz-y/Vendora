import type { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { sendError, sendSuccess } from "../../utils/apiResponse";

// A production readiness/liveness probe needs to know the app can actually
// serve traffic, not just that the Express process is up — an unreachable
// database is exactly the failure mode this is meant to catch. 503 (not
// 200-with-a-status-field) so uptime monitors/load balancers/orchestrators
// treat it as genuinely unhealthy.
export async function getHealth(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, { status: "ok", database: "connected" }, "Vendora API is running");
  } catch (err) {
    console.error("Health check: database unreachable", err);
    sendError(res, "Database unreachable", "DATABASE_UNAVAILABLE", 503);
  }
}

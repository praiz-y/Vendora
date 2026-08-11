import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const app = createApp();

// The failure path (503 when the database is unreachable) is real code in
// health.controller.ts but isn't covered here — simulating a genuine DB
// outage would mean mocking Prisma, which this project's test suite
// deliberately avoids (see phase-15-report.md: integration tests hit a
// real database, not mocks).
describe("GET /api/v1/health", () => {
  it("reports ok with a connected database", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ status: "ok", database: "connected" });
  });
});

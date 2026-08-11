import { afterEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import { env } from "../src/config/env";
import { errorHandler } from "../src/middlewares/errorHandler";

function fakeResponse() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

describe("errorHandler (unhandled, non-ApiError errors)", () => {
  const originalNodeEnv = env.nodeEnv;

  afterEach(() => {
    env.nodeEnv = originalNodeEnv;
  });

  // Phase 15 hardening: a raw internal error message (e.g. naming a Prisma
  // column/table) must never reach the client in production — only ever
  // logged server-side there.
  it("replaces the raw error message with a generic one in production", () => {
    env.nodeEnv = "production";
    const res = fakeResponse();

    errorHandler(new Error("relation \"Widget\" does not exist"), {} as never, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.message).toBe("Something went wrong");
    expect(body.message).not.toContain("Widget");
  });

  it("still surfaces the real error message outside production, for debugging", () => {
    env.nodeEnv = "development";
    const res = fakeResponse();

    errorHandler(new Error("relation \"Widget\" does not exist"), {} as never, res, vi.fn());

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.message).toContain("Widget");
  });
});

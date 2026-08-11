import type { Request, Response } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/ApiError";
import { clearGuestCartCookie, clearRefreshCookie, setRefreshCookie } from "../../utils/cookies";
import * as authService from "./auth.service";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.validation";

function requestMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
    // Present only for a guest who built an anonymous cart before logging
    // in/registering — auth.service.ts merges it into the account's own
    // cart, then this cookie is cleared below regardless (its cart no
    // longer exists either way, once merged).
    guestCartToken: req.cookies?.[env.guestCart.cookieName] as string | undefined,
  };
}

function sendSession(res: Response, session: authService.SessionResult, message: string) {
  setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
  clearGuestCartCookie(res);
  sendSuccess(res, { user: session.user, accessToken: session.accessToken }, message, 200);
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.register(req.body as RegisterInput, requestMeta(req));
  sendSession(res, session, "Account created successfully.");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.login(req.body as LoginInput, requestMeta(req));
  sendSession(res, session, "Logged in successfully.");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[env.refreshToken.cookieName] as string | undefined;
  if (!rawToken) {
    throw ApiError.unauthorized("No refresh session found.", "NO_REFRESH_TOKEN");
  }
  const session = await authService.refreshSession(rawToken, requestMeta(req));
  sendSession(res, session, "Session refreshed.");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[env.refreshToken.cookieName] as string | undefined;
  await authService.logout(rawToken);
  clearRefreshCookie(res);
  sendSuccess(res, null, "Logged out successfully.");
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.user!.id);
  clearRefreshCookie(res);
  sendSuccess(res, null, "Logged out of all sessions.");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  sendSuccess(res, { user }, "Current user retrieved.");
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body as ForgotPasswordInput);
  sendSuccess(res, null, "If an account with that email exists, a reset link has been sent.");
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as ResetPasswordInput;
  await authService.resetPassword(token, newPassword);
  sendSuccess(res, null, "Password has been reset. Please log in again.");
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;
  await authService.changePassword(req.user!.id, currentPassword, newPassword);
  clearRefreshCookie(res);
  sendSuccess(res, null, "Password changed. Please log in again.");
});

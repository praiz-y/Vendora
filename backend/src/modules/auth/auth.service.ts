import { Prisma, type Store, type User } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { mergeGuestCartIntoUserCart } from "../cart/cart.service";
import { hashPassword, verifyPassword } from "../../services/password.service";
import { sendPasswordResetEmail } from "../../services/email.service";
import {
  issuePasswordResetToken,
  consumePasswordResetToken,
  issueRefreshToken,
  lookupRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshTokenById,
  rotateRefreshToken,
  signAccessToken,
} from "../../services/token.service";
import { ApiError } from "../../utils/ApiError";
import type { ForgotPasswordInput, LoginInput, RegisterInput } from "./auth.validation";

// A bcrypt hash of an arbitrary, never-used password. Compared against on a
// "user not found" login attempt so that lookup succeeding vs. failing takes
// roughly the same amount of time either way (mitigates timing-based account
// enumeration on top of the already-generic error message).
const DUMMY_PASSWORD_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8O6ZXcAK2A6l/Kk7z2m2xW1z4X8i4W";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface SafeUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: User["role"];
  status: User["status"];
  createdAt: Date;
  updatedAt: Date;
  isAdmin: boolean;
  seller: {
    status: Store["status"];
    storeId: string;
    storeSlug: string;
    storeName: string;
  } | null;
}

export function toSafeUser(user: User, store: Store | null): SafeUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isAdmin: user.role === "ADMIN",
    seller: store
      ? { status: store.status, storeId: store.id, storeSlug: store.slug, storeName: store.name }
      : null,
  };
}

async function loadSafeUser(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { store: true } });
  if (!user) return null;
  return toSafeUser(user, user.store);
}

export interface SessionResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

async function createSession(user: User, meta: { userAgent?: string; ipAddress?: string }): Promise<SessionResult> {
  const [store, accessToken, { raw: refreshToken, expiresAt: refreshTokenExpiresAt }] = await Promise.all([
    prisma.store.findUnique({ where: { sellerId: user.id } }),
    Promise.resolve(signAccessToken({ sub: user.id, role: user.role })),
    issueRefreshToken(user.id, meta),
  ]);

  return { user: toSafeUser(user, store), accessToken, refreshToken, refreshTokenExpiresAt };
}

export interface AuthRequestMeta {
  userAgent?: string;
  ipAddress?: string;
  // Present only when the browser presented a guest-cart cookie — see
  // cart.service.ts's mergeGuestCartIntoUserCart for what happens to it.
  guestCartToken?: string;
}

export async function register(input: RegisterInput, meta: AuthRequestMeta): Promise<SessionResult> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  let user: User;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          username: input.username,
          email,
          passwordHash,
        },
      });
      // Every user gets a cart up front so the rest of the app never has to
      // handle "user with no cart yet" as a special case.
      await tx.cart.create({ data: { userId: created.id } });
      // Folds in whatever the person added to their cart before registering
      // — same transaction, so account creation and the cart merge commit
      // (or roll back) together.
      await mergeGuestCartIntoUserCart(tx, { guestToken: meta.guestCartToken, userId: created.id });
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      if (target.includes("email")) {
        throw ApiError.conflict("An account with this email already exists.", "EMAIL_TAKEN");
      }
      if (target.includes("username")) {
        throw ApiError.conflict("This username is already taken.", "USERNAME_TAKEN");
      }
      throw ApiError.conflict("Account could not be created due to a conflicting value.", "CONFLICT");
    }
    throw error;
  }

  return createSession(user, meta);
}

export async function login(input: LoginInput, meta: AuthRequestMeta): Promise<SessionResult> {
  const identifier = input.identifier.trim();
  const isEmail = identifier.includes("@");

  const user = await prisma.user.findUnique({
    where: isEmail ? { email: normalizeEmail(identifier) } : { username: identifier },
  });

  const passwordToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(input.password, passwordToCompare);

  if (!user || !passwordMatches) {
    // Deliberately generic — do not reveal whether the account exists.
    throw ApiError.unauthorized("Invalid email/username or password.", "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    // Safe to be specific here: the user just proved they own these
    // credentials, so this isn't an account-enumeration risk.
    throw ApiError.forbidden("This account has been suspended.", "ACCOUNT_SUSPENDED");
  }

  await prisma.$transaction((tx) => mergeGuestCartIntoUserCart(tx, { guestToken: meta.guestCartToken, userId: user.id }));

  return createSession(user, meta);
}

export interface RefreshResult extends SessionResult {}

export async function refreshSession(
  rawRefreshToken: string,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<RefreshResult> {
  const lookup = await lookupRefreshToken(rawRefreshToken);

  if (lookup.outcome === "not_found") {
    throw ApiError.unauthorized("Invalid refresh token.", "INVALID_REFRESH_TOKEN");
  }

  if (lookup.outcome === "revoked") {
    // The presented token was already rotated/revoked once before — this is
    // a signal of possible token theft/reuse. Nuke every session for this
    // user so a stolen-and-replayed token can't keep working.
    await revokeAllRefreshTokensForUser(lookup.record.userId);
    throw ApiError.unauthorized(
      "This session is no longer valid. Please log in again.",
      "REFRESH_TOKEN_REUSE_DETECTED"
    );
  }

  if (lookup.outcome === "expired") {
    throw ApiError.unauthorized("Your session has expired. Please log in again.", "REFRESH_TOKEN_EXPIRED");
  }

  const { record } = lookup;
  const user = await prisma.user.findUnique({ where: { id: record.userId } });

  if (!user || user.status !== "ACTIVE") {
    await revokeRefreshTokenById(record.id);
    throw ApiError.unauthorized("Your session is no longer valid.", "SESSION_INVALID");
  }

  const [store, accessToken, { raw: refreshToken, expiresAt: refreshTokenExpiresAt }] = await Promise.all([
    prisma.store.findUnique({ where: { sellerId: user.id } }),
    Promise.resolve(signAccessToken({ sub: user.id, role: user.role })),
    rotateRefreshToken(record.id, user.id, meta),
  ]);

  return { user: toSafeUser(user, store), accessToken, refreshToken, refreshTokenExpiresAt };
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  const lookup = await lookupRefreshToken(rawRefreshToken);
  if (lookup.outcome === "valid" || lookup.outcome === "expired") {
    await revokeRefreshTokenById(lookup.record.id);
  }
}

export async function logoutAll(userId: string): Promise<void> {
  await revokeAllRefreshTokensForUser(userId);
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await loadSafeUser(userId);
  if (!user) throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  return user;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });

  // Always behave the same way regardless of whether the account exists.
  if (!user) return;

  const { raw } = await issuePasswordResetToken(user.id);
  const resetUrl = `${env.frontendUrl}/reset-password?token=${raw}`;
  await sendPasswordResetEmail({ toEmail: user.email, resetUrl });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await consumePasswordResetToken(token);
  if (!record) {
    throw ApiError.badRequest("This reset link is invalid or has expired.", "INVALID_RESET_TOKEN");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) {
    throw ApiError.unauthorized("Current password is incorrect.", "INVALID_CURRENT_PASSWORD");
  }

  const passwordHash = await hashPassword(newPassword);
  // Safer-by-default: a password change invalidates every session, including
  // the one making this request — the frontend redirects to login afterward.
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../config/prisma";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

// Minimal claims only (user id + role) — no email/name, per the "don't put
// sensitive personal info in the JWT" requirement. `role` is trusted for the
// token's short lifetime (15m default); seller capability is NEVER encoded
// here since it can change independently and must always be checked live
// against the database (see middlewares/authorize.ts).
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTokenTtl as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

function generateRawToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export interface RefreshTokenMeta {
  userAgent?: string;
  ipAddress?: string;
}

// Creates a new RefreshToken row and returns the RAW value (only ever held
// in memory here and inside the HttpOnly cookie — never stored in the DB).
export async function issueRefreshToken(userId: string, meta: RefreshTokenMeta = {}) {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + env.refreshToken.ttlDays * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  return { raw, expiresAt };
}

export type RefreshTokenLookup =
  | { outcome: "valid"; record: NonNullable<Awaited<ReturnType<typeof findRefreshTokenRecord>>> }
  | { outcome: "not_found" }
  | { outcome: "revoked"; record: NonNullable<Awaited<ReturnType<typeof findRefreshTokenRecord>>> }
  | { outcome: "expired"; record: NonNullable<Awaited<ReturnType<typeof findRefreshTokenRecord>>> };

async function findRefreshTokenRecord(tokenHash: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

// Looks up a raw refresh token and classifies its state. Reuse of an already
// revoked/rotated token is reported distinctly (`revoked`) so callers can
// treat it as a signal of possible token theft (see auth.service.ts).
export async function lookupRefreshToken(raw: string): Promise<RefreshTokenLookup> {
  const tokenHash = hashToken(raw);
  const record = await findRefreshTokenRecord(tokenHash);

  if (!record) return { outcome: "not_found" };
  if (record.revokedAt) return { outcome: "revoked", record };
  if (record.expiresAt.getTime() < Date.now()) return { outcome: "expired", record };
  return { outcome: "valid", record };
}

// Rotation: revoke the presented token and issue a brand new one, linking
// them via replacedByTokenHash for traceability.
export async function rotateRefreshToken(oldTokenId: string, userId: string, meta: RefreshTokenMeta = {}) {
  const { raw, expiresAt } = await issueRefreshToken(userId, meta);
  const newTokenHash = hashToken(raw);

  await prisma.refreshToken.update({
    where: { id: oldTokenId },
    data: { revokedAt: new Date(), replacedByTokenHash: newTokenHash },
  });

  return { raw, expiresAt };
}

export async function revokeRefreshTokenById(id: string) {
  await prisma.refreshToken.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokensForUser(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// --- Password reset tokens ---------------------------------------------

export async function issuePasswordResetToken(userId: string) {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + env.passwordReset.ttlMinutes * 60 * 1000);

  await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });

  return { raw, expiresAt };
}

export async function consumePasswordResetToken(raw: string) {
  const tokenHash = hashToken(raw);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return null;
  }

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record;
}

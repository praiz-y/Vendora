import { Prisma, type Store, type User } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { recordAuditLog } from "../../../utils/auditLog";
import { revokeAllRefreshTokensForUser } from "../../../services/token.service";
import { toSafeUser, type SafeUser } from "../../auth/auth.service";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../../utils/pagination";
import type { ListUsersQuery } from "./users.admin.validation";

// Adds isFeatured to the store/seller projection — SafeUser's own `seller`
// field (shared with every authenticated session response, not just admin)
// deliberately doesn't carry it. Scoped to this admin module only, so the
// general auth serialization stays untouched.
export interface AdminSafeUser extends SafeUser {
  seller: (SafeUser["seller"] & { isFeatured: boolean }) | null;
}

function toAdminSafeUser(user: User, store: Store | null): AdminSafeUser {
  const safe = toSafeUser(user, store);
  return { ...safe, seller: safe.seller && store ? { ...safe.seller, isFeatured: store.isFeatured } : null };
}

export interface ListUsersParams extends PaginationParams {
  role?: ListUsersQuery["role"];
  status?: ListUsersQuery["status"];
  search?: string;
}

export async function listUsers(params: ListUsersParams): Promise<{ users: AdminSafeUser[]; meta: PaginationMeta }> {
  const where: Prisma.UserWhereInput = {
    ...(params.role ? { role: params.role } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? {
          OR: [
            { firstName: { contains: params.search, mode: "insensitive" as const } },
            { lastName: { contains: params.search, mode: "insensitive" as const } },
            { username: { contains: params.search, mode: "insensitive" as const } },
            { email: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(params), include: { store: true } }),
    prisma.user.count({ where }),
  ]);

  return { users: users.map((u) => toAdminSafeUser(u, u.store)), meta: buildPaginationMeta(params, total) };
}

async function getUserOrThrow(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, include: { store: true } });
  if (!user) throw ApiError.notFound("User not found.", "USER_NOT_FOUND");
  return user;
}

export async function getUserById(id: string): Promise<AdminSafeUser> {
  const user = await getUserOrThrow(id);
  return toAdminSafeUser(user, user.store);
}

export async function suspendUser(adminId: string, id: string, reason: string): Promise<AdminSafeUser> {
  const user = await getUserOrThrow(id);
  if (user.role === "ADMIN") throw ApiError.badRequest("Admin accounts cannot be suspended.", "CANNOT_SUSPEND_ADMIN");
  if (user.status === "SUSPENDED") throw ApiError.conflict("This user is already suspended.", "USER_ALREADY_SUSPENDED");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { status: "SUSPENDED" } });
    await recordAuditLog(tx, { actorId: adminId, action: "USER_SUSPENDED", entityType: "User", entityId: id, metadata: { reason } });
  });

  // Not inside the transaction above (RefreshToken revocation doesn't need
  // to be atomic with the status flip — refreshSession already rejects any
  // non-ACTIVE user regardless of whether the token row itself is marked
  // revoked yet). Same "revoke every session" precedent as a password
  // reset (Phase 2), just admin-triggered instead of self-triggered.
  await revokeAllRefreshTokensForUser(id);

  return getUserById(id);
}

export async function reactivateUser(adminId: string, id: string): Promise<AdminSafeUser> {
  const user = await getUserOrThrow(id);
  if (user.status === "ACTIVE") throw ApiError.conflict("This user is already active.", "USER_ALREADY_ACTIVE");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { status: "ACTIVE" } });
    await recordAuditLog(tx, { actorId: adminId, action: "USER_REACTIVATED", entityType: "User", entityId: id });
  });

  return getUserById(id);
}

export async function suspendUserStore(adminId: string, id: string, reason: string): Promise<AdminSafeUser> {
  const user = await getUserOrThrow(id);
  if (!user.store) throw ApiError.notFound("This user does not have a store.", "STORE_NOT_FOUND");
  if (user.store.status === "SUSPENDED") throw ApiError.conflict("This store is already suspended.", "STORE_ALREADY_SUSPENDED");

  const storeId = user.store.id;
  await prisma.$transaction(async (tx) => {
    await tx.store.update({ where: { id: storeId }, data: { status: "SUSPENDED" } });
    await recordAuditLog(tx, { actorId: adminId, action: "STORE_SUSPENDED", entityType: "Store", entityId: storeId, metadata: { reason } });
  });

  return getUserById(id);
}

export async function reactivateUserStore(adminId: string, id: string): Promise<AdminSafeUser> {
  const user = await getUserOrThrow(id);
  if (!user.store) throw ApiError.notFound("This user does not have a store.", "STORE_NOT_FOUND");
  if (user.store.status !== "SUSPENDED") {
    throw ApiError.conflict("Only a suspended store can be reactivated.", "STORE_NOT_SUSPENDED");
  }

  const storeId = user.store.id;
  await prisma.$transaction(async (tx) => {
    await tx.store.update({ where: { id: storeId }, data: { status: "ACTIVE" } });
    await recordAuditLog(tx, { actorId: adminId, action: "STORE_REACTIVATED", entityType: "Store", entityId: storeId });
  });

  return getUserById(id);
}

// Featured Stores (Overhaul Phase 5/Part 3): admin-curated via
// Store.isFeatured, surfaced here rather than a new top-level "Stores"
// admin section — this User detail page's Store block already shows
// Suspend/Reactivate Store, so it's the most consistent existing home for
// one more store-level admin toggle (Phase 10, not fully specified in
// planning — see phase-10-report.md).
export async function featureUserStore(adminId: string, id: string): Promise<AdminSafeUser> {
  const user = await getUserOrThrow(id);
  if (!user.store) throw ApiError.notFound("This user does not have a store.", "STORE_NOT_FOUND");
  if (user.store.isFeatured) throw ApiError.conflict("This store is already featured.", "STORE_ALREADY_FEATURED");

  const storeId = user.store.id;
  await prisma.$transaction(async (tx) => {
    await tx.store.update({ where: { id: storeId }, data: { isFeatured: true } });
    await recordAuditLog(tx, { actorId: adminId, action: "STORE_FEATURED", entityType: "Store", entityId: storeId });
  });

  return getUserById(id);
}

export async function unfeatureUserStore(adminId: string, id: string): Promise<AdminSafeUser> {
  const user = await getUserOrThrow(id);
  if (!user.store) throw ApiError.notFound("This user does not have a store.", "STORE_NOT_FOUND");
  if (!user.store.isFeatured) throw ApiError.conflict("This store is not featured.", "STORE_NOT_FEATURED");

  const storeId = user.store.id;
  await prisma.$transaction(async (tx) => {
    await tx.store.update({ where: { id: storeId }, data: { isFeatured: false } });
    await recordAuditLog(tx, { actorId: adminId, action: "STORE_UNFEATURED", entityType: "Store", entityId: storeId });
  });

  return getUserById(id);
}

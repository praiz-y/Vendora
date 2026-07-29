import { prisma } from "../config/prisma";

export interface AuthUser {
  id: string;
  role: "USER" | "ADMIN";
}

export function isAuthenticated(user: AuthUser | undefined): user is AuthUser {
  return !!user;
}

export function isAdmin(user: AuthUser | undefined): boolean {
  return user?.role === "ADMIN";
}

// Seller capability is a property of the CURRENT database state, never the
// JWT — a store can be suspended at any moment, and the access token has no
// way of knowing that until it expires. This is always a live query.
export async function hasActiveSellerCapability(userId: string): Promise<boolean> {
  const store = await prisma.store.findUnique({ where: { sellerId: userId }, select: { status: true } });
  return store?.status === "ACTIVE";
}

export function ownsResource(resourceOwnerId: string, user: AuthUser): boolean {
  return resourceOwnerId === user.id;
}

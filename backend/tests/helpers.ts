import { prisma } from "../src/config/prisma";

// The test database (vendora-postgres-test, port 5435) holds nothing but
// what tests create — safe to wipe entirely between suites.
export async function resetDatabase(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.address.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.sellerApplication.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@vendora.test`;
}

export function uniqueUsername(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

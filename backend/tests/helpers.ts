import { prisma } from "../src/config/prisma";

// The test database (vendora-postgres-test, port 5435) holds nothing but
// what tests create — safe to wipe entirely between suites.
//
// DigitalEntitlement and Order must go first: DigitalEntitlement.orderItem
// is onDelete Restrict (not Cascade), so it would block Order's cascade
// delete of its OrderItems if left in place. Order itself cascades away
// SellerOrder -> OrderItem, Payment -> PaymentAttempt, and StockReservation
// automatically — deleting it up front is what makes Address/Product/Store/
// User safe to delete further down (all Restrict-referenced by Order/
// SellerOrder/OrderItem/DigitalEntitlement).
export async function resetDatabase(): Promise<void> {
  await prisma.announcement.deleteMany();
  await prisma.heroSlide.deleteMany();
  await prisma.digitalEntitlement.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockReservation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.address.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.digitalProductVersion.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
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

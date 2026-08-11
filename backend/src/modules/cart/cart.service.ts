import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

const cartItemInclude = {
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      status: true,
      price: true,
      stockQuantity: true,
      shippingType: true,
      shippingFee: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      store: { select: { id: true, name: true, slug: true, status: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemWithProduct = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>;

// The single source of truth for "is this cart line still purchasable" —
// nothing here is snapshotted (Overview: "the backend revalidates... at
// checkout"), so both this GET and the eventual Phase 7 checkout re-derive
// availability from the live Product/Store every time, never from the cart row.
function evaluateAvailability(item: CartItemWithProduct): { isAvailable: boolean; issue?: string } {
  if (item.product.status !== "APPROVED") return { isAvailable: false, issue: "PRODUCT_UNAVAILABLE" };
  if (item.product.store.status !== "ACTIVE") return { isAvailable: false, issue: "STORE_UNAVAILABLE" };
  if (item.product.type === "PHYSICAL" && (item.product.stockQuantity ?? 0) < item.quantity) {
    return { isAvailable: false, issue: "INSUFFICIENT_STOCK" };
  }
  return { isAvailable: true };
}

function serializeCartItem(item: CartItemWithProduct) {
  return { ...item, ...evaluateAvailability(item) };
}

// Every function below takes a cartId, not a userId — the caller (an
// authenticated user's own cart, or an anonymous guest's cookie-identified
// cart) is already resolved by cart.middleware.ts's resolveCart() before
// any of these run, so cart ownership never needs re-deriving here.
export async function getCart(cartId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    include: cartItemInclude,
  });
  return { id: cartId, items: items.map(serializeCartItem) };
}

async function getOwnedCartItemOrThrow(cartId: string, itemId: string): Promise<CartItemWithProduct> {
  const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: cartItemInclude });
  if (!item || item.cartId !== cartId) throw ApiError.notFound("Cart item not found.", "CART_ITEM_NOT_FOUND");
  return item;
}

export async function addToCart(cartId: string, input: { productId: string; quantity: number }) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, type: true, status: true, stockQuantity: true, store: { select: { status: true } } },
  });
  if (!product || product.status !== "APPROVED" || product.store.status !== "ACTIVE") {
    throw ApiError.badRequest("This product is not available.", "PRODUCT_UNAVAILABLE");
  }

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId: input.productId } },
  });

  if (product.type === "DIGITAL") {
    // A digital product is one entitlement, not a stackable quantity —
    // re-adding an already-in-cart digital item is a no-op error, not an
    // increment.
    if (existing) throw ApiError.conflict("This item is already in your cart.", "ALREADY_IN_CART");

    // Phase 9: don't let a buyer pay again for a digital product they
    // already own — DigitalEntitlement is unique on (userId, productId), so
    // this is also the natural point to prevent the checkout-time conflict
    // rather than discovering it after payment succeeds. Guest carts can't
    // own an entitlement (no userId), so this only ever fires for an
    // authenticated user's own cart — harmless no-op check otherwise.
    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: cartId }, select: { userId: true } });
    if (cart.userId) {
      const alreadyOwned = await prisma.digitalEntitlement.findUnique({
        where: { userId_productId: { userId: cart.userId, productId: input.productId } },
      });
      if (alreadyOwned) throw ApiError.conflict("You already own this digital product.", "ALREADY_OWNED");
    }

    await prisma.cartItem.create({ data: { cartId, productId: input.productId, quantity: 1 } });
  } else {
    const newQuantity = (existing?.quantity ?? 0) + input.quantity;
    if ((product.stockQuantity ?? 0) < newQuantity) {
      throw ApiError.badRequest("Not enough stock available.", "INSUFFICIENT_STOCK");
    }
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId: input.productId } },
      create: { cartId, productId: input.productId, quantity: newQuantity },
      update: { quantity: newQuantity },
    });
  }

  return getCart(cartId);
}

export async function updateCartItemQuantity(cartId: string, itemId: string, quantity: number) {
  const item = await getOwnedCartItemOrThrow(cartId, itemId);

  if (item.product.type === "DIGITAL" && quantity !== 1) {
    throw ApiError.badRequest("Digital products can only have a quantity of 1.", "INVALID_QUANTITY");
  }
  if (item.product.type === "PHYSICAL" && (item.product.stockQuantity ?? 0) < quantity) {
    throw ApiError.badRequest("Not enough stock available.", "INSUFFICIENT_STOCK");
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return getCart(cartId);
}

export async function removeCartItem(cartId: string, itemId: string) {
  await getOwnedCartItemOrThrow(cartId, itemId);
  await prisma.cartItem.delete({ where: { id: itemId } });
  return getCart(cartId);
}

// Folds an anonymous cart into the account the guest just logged into or
// registered — combining quantities on duplicate physical products, and
// dropping (rather than duplicating) a digital item the account either
// already has in its own cart or already owns as an entitlement. A no-op if
// no guest cart token was presented, or if it doesn't match any cart (e.g.
// already merged, or simply never existed).
export async function mergeGuestCartIntoUserCart(
  client: PrismaClientOrTx,
  input: { guestToken: string | undefined; userId: string }
): Promise<void> {
  if (!input.guestToken) return;

  const guestCart = await client.cart.findUnique({
    where: { guestToken: input.guestToken },
    include: { items: { include: { product: { select: { type: true } } } } },
  });
  if (!guestCart) return;

  const targetCart = await client.cart.findUniqueOrThrow({ where: { userId: input.userId } });

  for (const item of guestCart.items) {
    if (item.product.type === "DIGITAL") {
      const alreadyOwned = await client.digitalEntitlement.findUnique({
        where: { userId_productId: { userId: input.userId, productId: item.productId } },
      });
      if (alreadyOwned) continue;

      await client.cartItem.upsert({
        where: { cartId_productId: { cartId: targetCart.id, productId: item.productId } },
        create: { cartId: targetCart.id, productId: item.productId, quantity: 1 },
        update: {},
      });
    } else {
      await client.cartItem.upsert({
        where: { cartId_productId: { cartId: targetCart.id, productId: item.productId } },
        create: { cartId: targetCart.id, productId: item.productId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      });
    }
  }

  await client.cart.delete({ where: { id: guestCart.id } });
}

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

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

export async function getCart(userId: string) {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId } });
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: "asc" },
    include: cartItemInclude,
  });
  return { id: cart.id, items: items.map(serializeCartItem) };
}

async function getOwnedCartItemOrThrow(userId: string, itemId: string): Promise<CartItemWithProduct> {
  const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: cartItemInclude });
  if (!item) throw ApiError.notFound("Cart item not found.", "CART_ITEM_NOT_FOUND");
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId } });
  if (item.cartId !== cart.id) throw ApiError.notFound("Cart item not found.", "CART_ITEM_NOT_FOUND");
  return item;
}

export async function addToCart(userId: string, input: { productId: string; quantity: number }) {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId } });

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, type: true, status: true, stockQuantity: true, store: { select: { status: true } } },
  });
  if (!product || product.status !== "APPROVED" || product.store.status !== "ACTIVE") {
    throw ApiError.badRequest("This product is not available.", "PRODUCT_UNAVAILABLE");
  }

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
  });

  if (product.type === "DIGITAL") {
    // A digital product is one entitlement, not a stackable quantity —
    // re-adding an already-in-cart digital item is a no-op error, not an
    // increment.
    if (existing) throw ApiError.conflict("This item is already in your cart.", "ALREADY_IN_CART");

    // Phase 9: don't let a buyer pay again for a digital product they
    // already own — DigitalEntitlement is unique on (userId, productId), so
    // this is also the natural point to prevent the checkout-time conflict
    // rather than discovering it after payment succeeds.
    const alreadyOwned = await prisma.digitalEntitlement.findUnique({
      where: { userId_productId: { userId, productId: input.productId } },
    });
    if (alreadyOwned) throw ApiError.conflict("You already own this digital product.", "ALREADY_OWNED");

    await prisma.cartItem.create({ data: { cartId: cart.id, productId: input.productId, quantity: 1 } });
  } else {
    const newQuantity = (existing?.quantity ?? 0) + input.quantity;
    if ((product.stockQuantity ?? 0) < newQuantity) {
      throw ApiError.badRequest("Not enough stock available.", "INSUFFICIENT_STOCK");
    }
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
      create: { cartId: cart.id, productId: input.productId, quantity: newQuantity },
      update: { quantity: newQuantity },
    });
  }

  return getCart(userId);
}

export async function updateCartItemQuantity(userId: string, itemId: string, quantity: number) {
  const item = await getOwnedCartItemOrThrow(userId, itemId);

  if (item.product.type === "DIGITAL" && quantity !== 1) {
    throw ApiError.badRequest("Digital products can only have a quantity of 1.", "INVALID_QUANTITY");
  }
  if (item.product.type === "PHYSICAL" && (item.product.stockQuantity ?? 0) < quantity) {
    throw ApiError.badRequest("Not enough stock available.", "INSUFFICIENT_STOCK");
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return getCart(userId);
}

export async function removeCartItem(userId: string, itemId: string) {
  await getOwnedCartItemOrThrow(userId, itemId);
  await prisma.cartItem.delete({ where: { id: itemId } });
  return getCart(userId);
}

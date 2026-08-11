import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { addToCart } from "../cart/cart.service";

const wishlistItemInclude = {
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      status: true,
      price: true,
      stockQuantity: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      store: { select: { id: true, name: true, slug: true, status: true } },
    },
  },
} satisfies Prisma.WishlistItemInclude;

type WishlistItemWithProduct = Prisma.WishlistItemGetPayload<{ include: typeof wishlistItemInclude }>;

// Same "respects availability" contract as the cart (Overview §20) — a
// wishlisted product that later gets rejected/archived or whose store gets
// suspended still shows up, just flagged, rather than silently vanishing.
function evaluateAvailability(item: WishlistItemWithProduct): { isAvailable: boolean; issue?: string } {
  if (item.product.status !== "APPROVED") return { isAvailable: false, issue: "PRODUCT_UNAVAILABLE" };
  if (item.product.store.status !== "ACTIVE") return { isAvailable: false, issue: "STORE_UNAVAILABLE" };
  if (item.product.type === "PHYSICAL" && (item.product.stockQuantity ?? 0) <= 0) {
    return { isAvailable: false, issue: "OUT_OF_STOCK" };
  }
  return { isAvailable: true };
}

function serialize(item: WishlistItemWithProduct) {
  return { ...item, ...evaluateAvailability(item) };
}

export async function getWishlist(userId: string) {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: wishlistItemInclude,
  });
  return items.map(serialize);
}

async function getOwnedWishlistItemOrThrow(userId: string, itemId: string): Promise<WishlistItemWithProduct> {
  const item = await prisma.wishlistItem.findUnique({ where: { id: itemId }, include: wishlistItemInclude });
  if (!item || item.userId !== userId) {
    throw ApiError.notFound("Wishlist item not found.", "WISHLIST_ITEM_NOT_FOUND");
  }
  return item;
}

export async function addToWishlist(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");

  try {
    await prisma.wishlistItem.create({ data: { userId, productId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict("This product is already in your wishlist.", "ALREADY_IN_WISHLIST");
    }
    throw error;
  }

  return getWishlist(userId);
}

export async function removeFromWishlist(userId: string, itemId: string) {
  await getOwnedWishlistItemOrThrow(userId, itemId);
  await prisma.wishlistItem.delete({ where: { id: itemId } });
  return getWishlist(userId);
}

// Adds the item to the cart (full validation via cart.service.addToCart —
// availability/stock rules are never duplicated) and only then removes it
// from the wishlist, so a rejected add (e.g. out of stock) leaves the
// wishlist untouched instead of losing the item. Wishlist stays
// account-gated (Overhaul Phase 3 only opened up Cart, not Wishlist), so
// this userId always has its own Cart row already.
export async function moveToCart(userId: string, itemId: string) {
  const item = await getOwnedWishlistItemOrThrow(userId, itemId);
  const userCart = await prisma.cart.findUniqueOrThrow({ where: { userId } });
  const cart = await addToCart(userCart.id, { productId: item.productId, quantity: 1 });
  await prisma.wishlistItem.delete({ where: { id: itemId } });
  return cart;
}

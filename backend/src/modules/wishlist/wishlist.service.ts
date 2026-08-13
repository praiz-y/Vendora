import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { getProductRatingSummaries } from "../reviews/reviews.service";
import { addToCart } from "../cart/cart.service";

// Matches marketplace.service.ts's publicProductSelect (plus product/store
// `status`, which marketplace omits since it only ever shows already-
// APPROVED/ACTIVE rows — wishlist needs those two fields itself, to flag an
// item unavailable rather than silently dropping it). Kept in this shape,
// not the narrower one this used to select, so the frontend can render a
// wishlist item through the exact same ProductCard as every other surface
// (Overhaul Phase 6) — including its rating and out-of-stock badge, which
// the previous select didn't carry.
const wishlistItemInclude = {
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      type: true,
      status: true,
      price: true,
      stockQuantity: true,
      shippingType: true,
      shippingFee: true,
      createdAt: true,
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, isPrimary: true } },
      category: { select: { id: true, name: true, slug: true } },
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

async function serializeAll(items: WishlistItemWithProduct[]) {
  const ratings = await getProductRatingSummaries(items.map((item) => item.productId));
  return items.map((item) => ({ ...item, ...evaluateAvailability(item), product: { ...item.product, rating: ratings.get(item.productId)! } }));
}

export async function getWishlist(userId: string) {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: wishlistItemInclude,
  });
  return serializeAll(items);
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

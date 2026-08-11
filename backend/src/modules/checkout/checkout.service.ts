import { Prisma, type Order } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { notify } from "../../utils/notifications";
import { charge, PROVIDER_NAME } from "../../services/paymentGateway.service";
import { getOrderDetail } from "../orders/orders.service";
import type { CheckoutInput, RetryPaymentInput } from "./checkout.validation";

const RESERVATION_TTL_MINUTES = 15;

// Prisma's interactive-transaction default (5s) has been observed to be too
// tight under this sandbox's occasional dev-environment slowdowns (see
// project-context.md's "dev servers degrade" note) — these transactions do
// nothing inherently slow, just a handful of sequential writes, so a longer
// ceiling only matters when the environment itself is under strain.
const TRANSACTION_OPTIONS = { timeout: 15_000 };

const checkoutCartItemInclude = {
  product: { include: { store: { select: { id: true, name: true, status: true } } } },
} satisfies Prisma.CartItemInclude;

type CheckoutCartItem = Prisma.CartItemGetPayload<{ include: typeof checkoutCartItemInclude }>;

interface CartProblem {
  productId: string;
  productName: string;
  issue: "PRODUCT_UNAVAILABLE" | "STORE_UNAVAILABLE" | "INSUFFICIENT_STOCK";
}

function validateItems(items: CheckoutCartItem[]): CartProblem[] {
  const problems: CartProblem[] = [];
  for (const item of items) {
    if (item.product.status !== "APPROVED") {
      problems.push({ productId: item.productId, productName: item.product.name, issue: "PRODUCT_UNAVAILABLE" });
    } else if (item.product.store.status !== "ACTIVE") {
      problems.push({ productId: item.productId, productName: item.product.name, issue: "STORE_UNAVAILABLE" });
    } else if (item.product.type === "PHYSICAL" && (item.product.stockQuantity ?? 0) < item.quantity) {
      problems.push({ productId: item.productId, productName: item.product.name, issue: "INSUFFICIENT_STOCK" });
    }
  }
  return problems;
}

async function loadValidatedCartItems(userId: string): Promise<CheckoutCartItem[]> {
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId } });
  const items = await prisma.cartItem.findMany({ where: { cartId: cart.id }, include: checkoutCartItemInclude });

  if (items.length === 0) throw ApiError.badRequest("Your cart is empty.", "CART_EMPTY");

  const problems = validateItems(items);
  if (problems.length > 0) {
    throw ApiError.conflict("Some items in your cart are no longer available.", "CART_VALIDATION_FAILED", { problems });
  }

  return items;
}

interface StoreGroup {
  store: { id: string; name: string };
  items: CheckoutCartItem[];
  subtotal: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
}

function computeTotals(items: CheckoutCartItem[]) {
  const byStore = new Map<string, StoreGroup>();

  for (const item of items) {
    const key = item.product.storeId;
    if (!byStore.has(key)) {
      byStore.set(key, {
        store: item.product.store,
        items: [],
        subtotal: new Prisma.Decimal(0),
        shippingFee: new Prisma.Decimal(0),
      });
    }
    const group = byStore.get(key)!;
    group.items.push(item);
    group.subtotal = group.subtotal.plus(item.product.price.times(item.quantity));
    // Flat per-listing fee, not multiplied by quantity — the item ships in
    // one parcel regardless of how many units are in it.
    if (item.product.type === "PHYSICAL" && item.product.shippingType === "FIXED" && item.product.shippingFee) {
      group.shippingFee = group.shippingFee.plus(item.product.shippingFee);
    }
  }

  let grandTotal = new Prisma.Decimal(0);
  for (const group of byStore.values()) {
    grandTotal = grandTotal.plus(group.subtotal).plus(group.shippingFee);
  }

  const needsShipping = items.some((item) => item.product.type === "PHYSICAL");

  return { byStore, grandTotal, needsShipping };
}

async function resolveShippingAddress(userId: string, needsShipping: boolean, shippingAddressId?: string) {
  if (!needsShipping) return null;
  if (!shippingAddressId) throw ApiError.badRequest("A shipping address is required.", "SHIPPING_ADDRESS_REQUIRED");

  const address = await prisma.address.findUnique({ where: { id: shippingAddressId } });
  if (!address || address.userId !== userId) throw ApiError.notFound("Address not found.", "ADDRESS_NOT_FOUND");
  return address;
}

async function createOrderGraph(
  userId: string,
  items: CheckoutCartItem[],
  totals: ReturnType<typeof computeTotals>,
  shippingAddressId: string | null
): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    // Final live re-check, inside the transaction, immediately before
    // reserving stock — Overview §13: "Immediately before order
    // creation/payment." Narrows the race window from a concurrent
    // checkout for the same limited-stock item; doesn't eliminate it
    // outright (would need row-level locking — see phase report).
    for (const item of items) {
      if (item.product.type !== "PHYSICAL") continue;
      const fresh = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
        select: { status: true, stockQuantity: true },
      });
      if (fresh.status !== "APPROVED" || (fresh.stockQuantity ?? 0) < item.quantity) {
        throw ApiError.conflict("Some items in your cart are no longer available.", "CART_VALIDATION_FAILED", {
          problems: [{ productId: item.productId, productName: item.product.name, issue: "INSUFFICIENT_STOCK" }],
        });
      }
    }

    const order = await tx.order.create({
      data: { buyerId: userId, status: "PENDING_PAYMENT", totalAmount: totals.grandTotal, shippingAddressId },
    });

    for (const group of totals.byStore.values()) {
      const sellerOrder = await tx.sellerOrder.create({
        data: {
          orderId: order.id,
          storeId: group.store.id,
          subtotal: group.subtotal,
          shippingFee: group.shippingFee,
          total: group.subtotal.plus(group.shippingFee),
        },
      });

      for (const item of group.items) {
        const isFixedShipping = item.product.type === "PHYSICAL" && item.product.shippingType === "FIXED";

        await tx.orderItem.create({
          data: {
            sellerOrderId: sellerOrder.id,
            productId: item.productId,
            productNameSnapshot: item.product.name,
            priceSnapshot: item.product.price,
            quantity: item.quantity,
            productTypeSnapshot: item.product.type,
            shippingFeeSnapshot: isFixedShipping ? item.product.shippingFee : null,
            storeNameSnapshot: group.store.name,
          },
        });

        if (item.product.type === "PHYSICAL") {
          await tx.stockReservation.create({
            data: {
              productId: item.productId,
              orderId: order.id,
              quantity: item.quantity,
              status: "ACTIVE",
              expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000),
            },
          });
        }
      }
    }

    await tx.payment.create({
      data: { orderId: order.id, provider: PROVIDER_NAME, amount: totals.grandTotal, status: "PENDING" },
    });

    return order;
  }, TRANSACTION_OPTIONS);
}

async function finalizeSuccessfulPayment(orderId: string, paymentId: string, providerReference: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: paymentId }, data: { status: "SUCCESS", paidAt: new Date(), providerReference } });
    await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });

    const reservations = await tx.stockReservation.findMany({ where: { orderId, status: "ACTIVE" } });
    for (const reservation of reservations) {
      await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: "CONFIRMED" } });
      await tx.product.update({
        where: { id: reservation.productId },
        data: { stockQuantity: { decrement: reservation.quantity } },
      });
    }

    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { buyerId: true } });
    const orderItems = await tx.orderItem.findMany({
      where: { sellerOrder: { orderId } },
      select: { id: true, productId: true, productTypeSnapshot: true },
    });

    for (const item of orderItems) {
      if (item.productTypeSnapshot !== "DIGITAL") continue;
      // upsert, not create+catch(P2002): a Postgres error inside an
      // interactive transaction aborts the *entire* transaction — every
      // later statement fails with 25P02 even if the JS error is caught —
      // so a re-purchase of an already-owned digital product (cart.service
      // blocks adding one, but a concurrent second checkout could still
      // race here) must never throw in the first place.
      await tx.digitalEntitlement.upsert({
        where: { userId_productId: { userId: order.buyerId, productId: item.productId } },
        create: { userId: order.buyerId, productId: item.productId, orderItemId: item.id },
        update: {},
      });
    }

    // Only clear the items actually purchased, in case the buyer added
    // something new to their cart in the (short) window since checkout began.
    const purchasedProductIds = orderItems.map((item) => item.productId);
    const cart = await tx.cart.findUnique({ where: { userId: order.buyerId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId: { in: purchasedProductIds } } });
    }

    await notify(tx, {
      userId: order.buyerId,
      type: "PAYMENT_SUCCESS",
      title: "Payment successful",
      message: "Your payment was successful and your order has been placed.",
      relatedEntityType: "Order",
      relatedEntityId: orderId,
    });

    const sellerOrders = await tx.sellerOrder.findMany({
      where: { orderId },
      select: { id: true, store: { select: { sellerId: true, name: true } } },
    });
    for (const sellerOrder of sellerOrders) {
      await notify(tx, {
        userId: sellerOrder.store.sellerId,
        type: "ORDER_PLACED",
        title: "You have a new order",
        message: `A buyer just placed an order with "${sellerOrder.store.name}".`,
        relatedEntityType: "SellerOrder",
        relatedEntityId: sellerOrder.id,
      });
    }
  }, TRANSACTION_OPTIONS);
}

async function releaseReservationsForOrder(orderId: string): Promise<void> {
  await prisma.stockReservation.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "RELEASED" } });
}

async function attemptPaymentAndFinalize(orderId: string, simulateFailure?: boolean) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });

  const result = await charge({ amount: payment.amount.toString(), currency: payment.currency, simulateFailure });

  await prisma.paymentAttempt.create({
    data: {
      paymentId: payment.id,
      provider: PROVIDER_NAME,
      providerReference: result.providerReference,
      amount: payment.amount,
      status: result.status,
      rawResponse: result.rawResponse as Prisma.InputJsonValue,
    },
  });

  if (result.status === "SUCCESS") {
    await finalizeSuccessfulPayment(orderId, payment.id, result.providerReference);
  } else {
    await releaseReservationsForOrder(orderId);
  }

  return getOrderDetail(orderId);
}

// The whole checkout, start to finish, in one call — reasonable because the
// payment gateway is simulated and resolves synchronously. A real
// (redirect/webhook-based) provider would split this into "create order,
// redirect buyer" and "webhook confirms payment, finalize" instead.
export async function checkout(userId: string, input: CheckoutInput) {
  const items = await loadValidatedCartItems(userId);
  const totals = computeTotals(items);
  const address = await resolveShippingAddress(userId, totals.needsShipping, input.shippingAddressId);

  const order = await createOrderGraph(userId, items, totals, address?.id ?? null);

  return attemptPaymentAndFinalize(order.id, input.simulateFailure);
}

export async function retryPayment(userId: string, orderId: string, input: RetryPaymentInput) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== userId) throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");
  if (order.status !== "PENDING_PAYMENT") {
    throw ApiError.conflict(
      "This order has already been paid, or is no longer awaiting payment.",
      "ORDER_NOT_AWAITING_PAYMENT"
    );
  }

  // A prior failed attempt released the earlier reservations — re-validate
  // and re-reserve before charging again, exactly like a fresh checkout.
  const orderItems = await prisma.orderItem.findMany({
    where: { sellerOrder: { orderId } },
    select: {
      productId: true,
      quantity: true,
      productTypeSnapshot: true,
      product: { select: { name: true, status: true, stockQuantity: true } },
    },
  });

  const problems: CartProblem[] = [];
  for (const item of orderItems) {
    if (item.productTypeSnapshot !== "PHYSICAL") continue;
    if (item.product.status !== "APPROVED" || (item.product.stockQuantity ?? 0) < item.quantity) {
      problems.push({ productId: item.productId, productName: item.product.name, issue: "INSUFFICIENT_STOCK" });
    }
  }
  if (problems.length > 0) {
    throw ApiError.conflict("Some items in this order are no longer available.", "CART_VALIDATION_FAILED", { problems });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      if (item.productTypeSnapshot !== "PHYSICAL") continue;
      await tx.stockReservation.create({
        data: {
          productId: item.productId,
          orderId,
          quantity: item.quantity,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000),
        },
      });
    }
  }, TRANSACTION_OPTIONS);

  return attemptPaymentAndFinalize(orderId, input.simulateFailure);
}

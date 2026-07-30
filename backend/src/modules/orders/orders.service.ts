import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../utils/pagination";

export const orderInclude = {
  shippingAddress: true,
  payment: { include: { attempts: { orderBy: { attemptedAt: "desc" as const } } } },
  sellerOrders: {
    include: {
      store: { select: { id: true, name: true, slug: true } },
      // `review` lets the buyer UI show "leave a review" only for items
      // that don't have one yet, without a separate lookup per item.
      items: { include: { review: { select: { id: true } } } },
    },
  },
} satisfies Prisma.OrderInclude;

export async function getOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");
  return order;
}

export interface ListMyOrdersParams extends PaginationParams {
  status?: OrderStatus;
}

export async function listMyOrders(
  userId: string,
  params: ListMyOrdersParams
): Promise<{ orders: unknown[]; meta: PaginationMeta }> {
  const where = { buyerId: userId, ...(params.status ? { status: params.status } : {}) };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { placedAt: "desc" }, ...toSkipTake(params), include: orderInclude }),
    prisma.order.count({ where }),
  ]);

  return { orders, meta: buildPaginationMeta(params, total) };
}

export async function getMyOrder(userId: string, orderId: string) {
  const order = await getOrderDetail(orderId);
  // Ownership mismatch reported as the same 404 as a nonexistent id — never
  // confirms someone else's order id exists (same pattern as addresses).
  if (order.buyerId !== userId) throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");
  return order;
}

export async function cancelMyOrder(userId: string, orderId: string) {
  const order = await getMyOrder(userId, orderId);

  if (order.status !== "PENDING_PAYMENT") {
    throw ApiError.conflict(
      "Only orders still awaiting payment can be cancelled — a paid order needs a refund request instead.",
      "ORDER_NOT_CANCELLABLE"
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.stockReservation.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "RELEASED" } });
    await tx.sellerOrder.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
  });

  return getMyOrder(userId, orderId);
}

// Recomputes the parent Order's aggregate status from its SellerOrders'
// individual statuses — called after every SellerOrder status transition
// (seller-orders.service.ts). Deliberately does nothing while PENDING_PAYMENT
// (governed by the payment flow, not fulfillment) or once CANCELLED (terminal).
export async function deriveAndUpdateOrderStatus(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
  if (order.status === "PENDING_PAYMENT" || order.status === "CANCELLED") return;

  const sellerOrders = await prisma.sellerOrder.findMany({ where: { orderId }, select: { status: true } });
  const nonCancelled = sellerOrders.map((s) => s.status).filter((s) => s !== "CANCELLED");

  let next: OrderStatus;
  if (nonCancelled.length === 0) {
    next = "CANCELLED";
  } else if (nonCancelled.every((s) => s === "DELIVERED")) {
    next = "COMPLETED";
  } else if (nonCancelled.some((s) => s === "DELIVERED")) {
    next = "PARTIALLY_DELIVERED";
  } else if (nonCancelled.some((s) => s === "SHIPPED")) {
    next = "PARTIALLY_SHIPPED";
  } else if (nonCancelled.some((s) => s === "PROCESSING")) {
    next = "PARTIALLY_PROCESSING";
  } else {
    next = "PAID";
  }

  if (next !== order.status) {
    await prisma.order.update({ where: { id: orderId }, data: { status: next } });
  }
}

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../utils/pagination";
import type { CreateRefundInput } from "./refunds.validation";

const refundInclude = {
  sellerOrder: { select: { id: true, orderId: true, total: true, store: { select: { id: true, name: true } } } },
} satisfies Prisma.RefundInclude;

// V1 scope (Overview §25: "basic refunds"): a refund always covers a whole
// SellerOrder — one seller's slice of a multi-vendor order — never a
// partial/custom amount or a single OrderItem. `amount` is always the
// SellerOrder's own total, never client-supplied.
export async function requestRefund(userId: string, input: CreateRefundInput) {
  const sellerOrder = await prisma.sellerOrder.findUnique({
    where: { id: input.sellerOrderId },
    select: { id: true, total: true, order: { select: { buyerId: true, status: true } } },
  });
  if (!sellerOrder) throw ApiError.notFound("Order not found.", "SELLER_ORDER_NOT_FOUND");

  // Same "don't confirm someone else's data exists" pattern as orders/addresses/reviews.
  if (sellerOrder.order.buyerId !== userId) throw ApiError.notFound("Order not found.", "SELLER_ORDER_NOT_FOUND");

  if (sellerOrder.order.status === "PENDING_PAYMENT" || sellerOrder.order.status === "CANCELLED") {
    throw ApiError.conflict("Only a paid order can be refunded.", "ORDER_NOT_PAID");
  }

  const alreadyProcessed = await prisma.refund.findFirst({
    where: { sellerOrderId: sellerOrder.id, status: "PROCESSED" },
  });
  if (alreadyProcessed) throw ApiError.conflict("This order has already been refunded.", "ALREADY_REFUNDED");

  try {
    return await prisma.refund.create({
      data: {
        sellerOrderId: sellerOrder.id,
        amount: sellerOrder.total,
        reason: input.reason,
        requestedById: userId,
      },
      include: refundInclude,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict("You already have a pending refund request for this order.", "REFUND_ALREADY_REQUESTED");
    }
    throw error;
  }
}

export interface ListMyRefundsParams extends PaginationParams {
  status?: "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSED";
}

export async function listMyRefunds(userId: string, params: ListMyRefundsParams) {
  // sellerOrderId: not null — V1 only ever creates SellerOrder-scoped
  // refunds (see requestRefund above), but the schema itself allows
  // order/orderItem scope too. A stray differently-scoped row (found via
  // pre-existing Phase 1 seed data during Phase 13's verification) has no
  // `sellerOrder` for this response shape to include, so it's excluded
  // rather than crashing the client that expects one.
  const where = {
    requestedById: userId,
    sellerOrderId: { not: null },
    ...(params.status ? { status: params.status } : {}),
  };

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(params), include: refundInclude }),
    prisma.refund.count({ where }),
  ]);

  return { refunds, meta: buildPaginationMeta(params, total) as PaginationMeta };
}

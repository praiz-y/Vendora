import { Prisma, type RefundStatus } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { recordAuditLog } from "../../../utils/auditLog";
import { notify } from "../../../utils/notifications";
import { refund as refundGateway } from "../../../services/paymentGateway.service";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../../utils/pagination";

const refundInclude = {
  sellerOrder: { select: { id: true, orderId: true, total: true, store: { select: { id: true, name: true } } } },
  requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.RefundInclude;

export interface ListRefundsParams extends PaginationParams {
  status?: RefundStatus;
}

export async function listRefunds(params: ListRefundsParams) {
  // See refunds.service.ts's listMyRefunds — same reasoning: only ever
  // return SellerOrder-scoped refunds, the only shape this phase's UI
  // (and getRefundOrThrow's own guard) can handle.
  const where = { sellerOrderId: { not: null }, ...(params.status ? { status: params.status } : {}) };

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(params), include: refundInclude }),
    prisma.refund.count({ where }),
  ]);

  return { refunds, meta: buildPaginationMeta(params, total) as PaginationMeta };
}

async function getRefundOrThrow(id: string) {
  const refund = await prisma.refund.findUnique({ where: { id }, include: refundInclude });
  if (!refund) throw ApiError.notFound("Refund request not found.", "REFUND_NOT_FOUND");
  // V1 scope (refunds.service.ts) only ever creates SellerOrder-scoped
  // refunds, even though the schema allows order/orderItem scope too —
  // this narrows the type back down to that guarantee.
  if (!refund.sellerOrder) throw ApiError.internal("Refund is missing its SellerOrder scope.", "REFUND_MISSING_SCOPE");
  return { ...refund, sellerOrder: refund.sellerOrder };
}

export async function getRefundById(id: string) {
  return getRefundOrThrow(id);
}

// Recomputes Payment.status from how many of the parent Order's
// SellerOrders now have a PROCESSED refund — REFUNDED once all of them do,
// PARTIALLY_REFUNDED if only some do. Same "pure function, recomputed on
// demand" shape as Order.status derivation (Phase 8).
async function derivePaymentRefundStatus(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const sellerOrders = await tx.sellerOrder.findMany({ where: { orderId }, select: { id: true } });
  const processedRefunds = await tx.refund.findMany({
    where: { sellerOrderId: { in: sellerOrders.map((so) => so.id) }, status: "PROCESSED" },
    select: { sellerOrderId: true },
  });
  const processedIds = new Set(processedRefunds.map((r) => r.sellerOrderId));
  const allRefunded = sellerOrders.length > 0 && sellerOrders.every((so) => processedIds.has(so.id));

  await tx.payment.update({
    where: { orderId },
    data: { status: allRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" },
  });
}

// Overview §25's flow is "Approve/Reject -> Payment Refund" as one admin
// decision, and the payment gateway is simulated/synchronous (same
// precedent as checkout, Phase 7) — so approving goes straight to
// PROCESSED in one call, rather than lingering at an intermediate
// APPROVED-but-not-yet-refunded state a real async provider would need.
export async function approveRefund(adminId: string, id: string) {
  const refund = await getRefundOrThrow(id);
  if (refund.status !== "REQUESTED") {
    throw ApiError.conflict("Only requested refunds can be approved.", "REFUND_NOT_REQUESTED");
  }

  const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: refund.sellerOrder.orderId } });
  const result = await refundGateway({
    amount: refund.amount.toString(),
    currency: payment.currency,
    originalReference: payment.providerReference ?? "",
  });

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id },
      data: {
        status: "PROCESSED",
        reviewedById: adminId,
        reviewedAt: new Date(),
        providerRefundReference: result.providerReference,
      },
    });

    await derivePaymentRefundStatus(tx, refund.sellerOrder.orderId);

    await recordAuditLog(tx, {
      actorId: adminId,
      action: "REFUND_APPROVED",
      entityType: "Refund",
      entityId: id,
      metadata: { providerRefundReference: result.providerReference },
    });

    await notify(tx, {
      userId: refund.requestedById,
      type: "REFUND_UPDATE",
      title: "Your refund was approved",
      message: `Your refund request for "${refund.sellerOrder.store.name}" has been processed.`,
      relatedEntityType: "Refund",
      relatedEntityId: id,
    });
  });

  return getRefundOrThrow(id);
}

export async function rejectRefund(adminId: string, id: string, reviewNote?: string) {
  const refund = await getRefundOrThrow(id);
  if (refund.status !== "REQUESTED") {
    throw ApiError.conflict("Only requested refunds can be rejected.", "REFUND_NOT_REQUESTED");
  }

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id },
      data: { status: "REJECTED", reviewedById: adminId, reviewedAt: new Date() },
    });

    await recordAuditLog(tx, {
      actorId: adminId,
      action: "REFUND_REJECTED",
      entityType: "Refund",
      entityId: id,
      metadata: reviewNote ? { reviewNote } : undefined,
    });

    await notify(tx, {
      userId: refund.requestedById,
      type: "REFUND_UPDATE",
      title: "Your refund request was rejected",
      message: reviewNote ?? `Your refund request for "${refund.sellerOrder.store.name}" was reviewed and rejected.`,
      relatedEntityType: "Refund",
      relatedEntityId: id,
    });
  });

  return getRefundOrThrow(id);
}

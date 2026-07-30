import { Prisma, type SellerOrderStatus } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../../utils/pagination";
import { deriveAndUpdateOrderStatus } from "../orders.service";

const sellerOrderInclude = {
  order: {
    select: {
      id: true,
      buyerId: true,
      placedAt: true,
      status: true,
      buyer: { select: { id: true, firstName: true, lastName: true, username: true } },
    },
  },
  items: true,
} satisfies Prisma.SellerOrderInclude;

// Only forward progress, plus an early-stage cancel — a SHIPPED order can't
// be cancelled through this endpoint (that needs a real return/refund
// process, out of scope for V1).
const ALLOWED_TRANSITIONS: Record<SellerOrderStatus, SellerOrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export interface ListMySellerOrdersParams extends PaginationParams {
  status?: SellerOrderStatus;
}

export async function listMySellerOrders(
  storeId: string,
  params: ListMySellerOrdersParams
): Promise<{ sellerOrders: unknown[]; meta: PaginationMeta }> {
  const where = { storeId, ...(params.status ? { status: params.status } : {}) };

  const [sellerOrders, total] = await Promise.all([
    prisma.sellerOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(params),
      include: sellerOrderInclude,
    }),
    prisma.sellerOrder.count({ where }),
  ]);

  return { sellerOrders, meta: buildPaginationMeta(params, total) };
}

async function getOwnedSellerOrderOrThrow(storeId: string, sellerOrderId: string) {
  const sellerOrder = await prisma.sellerOrder.findUnique({ where: { id: sellerOrderId }, include: sellerOrderInclude });
  if (!sellerOrder || sellerOrder.storeId !== storeId) {
    throw ApiError.notFound("Order not found.", "SELLER_ORDER_NOT_FOUND");
  }
  return sellerOrder;
}

export async function getMySellerOrder(storeId: string, sellerOrderId: string) {
  return getOwnedSellerOrderOrThrow(storeId, sellerOrderId);
}

export async function updateSellerOrderStatus(storeId: string, sellerOrderId: string, nextStatus: SellerOrderStatus) {
  const sellerOrder = await getOwnedSellerOrderOrThrow(storeId, sellerOrderId);

  const allowed = ALLOWED_TRANSITIONS[sellerOrder.status];
  if (!allowed.includes(nextStatus)) {
    throw ApiError.conflict(
      `Cannot move an order from ${sellerOrder.status} to ${nextStatus}.`,
      "INVALID_STATUS_TRANSITION"
    );
  }

  await prisma.sellerOrder.update({ where: { id: sellerOrderId }, data: { status: nextStatus } });
  await deriveAndUpdateOrderStatus(sellerOrder.orderId);

  return getOwnedSellerOrderOrThrow(storeId, sellerOrderId);
}

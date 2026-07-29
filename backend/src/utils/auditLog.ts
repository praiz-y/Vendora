import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export interface AuditLogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

// First consumer is seller-application approve/reject; every later
// admin-only state change (product moderation, refunds, suspensions, ...)
// should call this too instead of writing to AuditLog by hand. Accepts a
// transaction client so the audit entry commits atomically with the state
// change it's recording, never as a separate, potentially-inconsistent write.
export async function recordAuditLog(client: PrismaClientOrTx, input: AuditLogInput): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

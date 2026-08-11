import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

// The one entry point for writing to Notification (Phase 12) — same
// pattern as recordAuditLog (Phase 3): accepts either the shared client or
// an active transaction client, so the notification commits atomically
// with the state change that triggered it, never as a separate,
// potentially-inconsistent write.
export async function notify(client: PrismaClientOrTx, input: NotifyInput): Promise<void> {
  await client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    },
  });
}

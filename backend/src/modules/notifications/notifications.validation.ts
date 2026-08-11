import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

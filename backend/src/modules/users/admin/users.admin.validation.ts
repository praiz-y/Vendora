import { z } from "zod";

export const listUsersQuerySchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

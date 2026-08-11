import { z } from "zod";

export const updateAnnouncementSchema = z.object({
  message: z.string().trim().min(1).max(150),
  enabled: z.boolean(),
});
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

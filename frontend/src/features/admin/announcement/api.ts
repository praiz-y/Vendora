import { apiClient } from "@/lib/api/client";

export interface AdminAnnouncement {
  id: number;
  message: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface UpdateAnnouncementInput {
  message: string;
  enabled: boolean;
}

export const adminAnnouncementApi = {
  get: () => apiClient.get<{ announcement: AdminAnnouncement | null }>("/api/v1/admin/announcement"),
  update: (input: UpdateAnnouncementInput) =>
    apiClient.put<{ announcement: AdminAnnouncement }>("/api/v1/admin/announcement", input),
};

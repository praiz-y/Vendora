import { apiClient } from "@/lib/api/client";

export interface PublicAnnouncement {
  message: string;
  updatedAt: string;
}

export const announcementApi = {
  get: () => apiClient.get<{ announcement: PublicAnnouncement | null }>("/api/v1/announcement"),
};

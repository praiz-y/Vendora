import { apiClient } from "@/lib/api/client";
import type { SafeUser } from "@/types/user";

export interface SessionResponse {
  user: SafeUser;
  accessToken: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput) => apiClient.post<SessionResponse>("/api/v1/auth/register", input),
  login: (input: LoginInput) => apiClient.post<SessionResponse>("/api/v1/auth/login", input),
  logout: () => apiClient.post<null>("/api/v1/auth/logout"),
  logoutAll: () => apiClient.post<null>("/api/v1/auth/logout-all"),
  me: () => apiClient.get<{ user: SafeUser }>("/api/v1/auth/me"),
  forgotPassword: (input: { email: string }) => apiClient.post<null>("/api/v1/auth/forgot-password", input),
  resetPassword: (input: { token: string; newPassword: string }) =>
    apiClient.post<null>("/api/v1/auth/reset-password", input),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    apiClient.post<null>("/api/v1/auth/change-password", input),
};

"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { authApi, type LoginInput, type RegisterInput } from "./api";

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (data) => setSession(data.user, data.accessToken),
  });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => setSession(data.user, data.accessToken),
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearSession();
      router.push("/login");
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (input: { email: string }) => authApi.forgotPassword(input) });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; newPassword: string }) => authApi.resetPassword(input),
  });
}

export function useChangePassword() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const router = useRouter();
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => authApi.changePassword(input),
    onSuccess: () => {
      // The backend revokes every session on a successful password change —
      // the frontend mirrors that by dropping local state and sending the
      // user back through login.
      clearSession();
      router.push("/login");
    },
  });
}

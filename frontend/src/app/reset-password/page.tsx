"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { PasswordField } from "@/components/ui/PasswordField";
import { useResetPassword } from "@/features/auth/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const resetPassword = useResetPassword();
  const [newPassword, setNewPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    resetPassword.mutate(
      { token, newPassword },
      { onSuccess: () => setTimeout(() => router.push("/login"), 1500) }
    );
  }

  if (!token) {
    return (
      <FormMessage type="error">
        This reset link is missing its token. Please request a new one from the{" "}
        <Link href="/forgot-password" className="underline">
          forgot password
        </Link>{" "}
        page.
      </FormMessage>
    );
  }

  if (resetPassword.isSuccess) {
    return <FormMessage type="success">Password reset. Redirecting you to login…</FormMessage>;
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <PasswordField
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      {resetPassword.isError && <FormMessage type="error">{getErrorMessage(resetPassword.error)}</FormMessage>}

      <Button type="submit" loading={resetPassword.isPending}>
        Reset password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-xl font-semibold text-heading">Set a new password</h1>
      </div>

      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { useForgotPassword } from "@/features/auth/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    forgotPassword.mutate({ email });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-xl font-semibold text-heading">Forgot your password?</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your email and, if an account exists, we&apos;ll send a reset link.
        </p>
      </div>

      {forgotPassword.isSuccess ? (
        <FormMessage type="success">
          If an account with that email exists, a reset link has been sent.
        </FormMessage>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {forgotPassword.isError && <FormMessage type="error">{getErrorMessage(forgotPassword.error)}</FormMessage>}

          <Button type="submit" loading={forgotPassword.isPending}>
            Send reset link
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-primary underline">
          Back to login
        </Link>
      </p>
    </main>
  );
}

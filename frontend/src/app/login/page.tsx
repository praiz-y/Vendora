"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { useLogin } from "@/features/auth/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { resolveRedirectTarget } from "@/lib/redirectTarget";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const redirectTo = resolveRedirectTarget(searchParams.get("from"));
    login.mutate({ identifier, password }, { onSuccess: () => router.push(redirectTo) });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-xl font-semibold">Log in to Vendora</h1>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          label="Email or username"
          name="identifier"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {login.isError && <FormMessage type="error">{getErrorMessage(login.error)}</FormMessage>}

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-foreground/60 underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={login.isPending}>
          Log in
        </Button>
      </form>

      <p className="text-center text-sm text-foreground/60">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground underline">
          Register
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

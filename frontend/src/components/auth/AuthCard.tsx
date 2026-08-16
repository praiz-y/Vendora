"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { useLogin, useRegister } from "@/features/auth/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { resolveRedirectTarget } from "@/lib/redirectTarget";

type Mode = "login" | "register";

function LoginFields({ from }: { from: string | null }) {
  const router = useRouter();
  const login = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const redirectTo = resolveRedirectTarget(from);
    login.mutate({ identifier, password }, { onSuccess: () => router.push(redirectTo) });
  }

  return (
    <form className="flex w-full max-w-sm flex-col gap-4" onSubmit={handleSubmit}>
      <h1 className="text-xl font-semibold text-heading">Log in to Vendora</h1>
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
      <a href="/forgot-password" className="self-end text-sm text-muted underline hover:text-heading">
        Forgot password?
      </a>
      <Button type="submit" loading={login.isPending}>
        Log in
      </Button>
    </form>
  );
}

function RegisterFields({ from }: { from: string | null }) {
  const router = useRouter();
  const register = useRegister();
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", email: "", password: "" });

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const redirectTo = resolveRedirectTarget(from);
    register.mutate(form, { onSuccess: () => router.push(redirectTo) });
  }

  return (
    <form className="flex w-full max-w-sm flex-col gap-4" onSubmit={handleSubmit}>
      <div>
        <h1 className="text-xl font-semibold text-heading">Create your Vendora account</h1>
        <p className="mt-1 text-sm text-muted">Every account starts as a buyer.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="First name" name="firstName" autoComplete="given-name" required value={form.firstName} onChange={handleChange("firstName")} />
        <TextField label="Last name" name="lastName" autoComplete="family-name" required value={form.lastName} onChange={handleChange("lastName")} />
      </div>
      <TextField label="Username" name="username" autoComplete="username" required minLength={3} value={form.username} onChange={handleChange("username")} />
      <TextField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange("email")} />
      <PasswordField label="Password" name="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={handleChange("password")} />
      {register.isError && <FormMessage type="error">{getErrorMessage(register.error)}</FormMessage>}
      <Button type="submit" loading={register.isPending}>
        Create account
      </Button>
    </form>
  );
}

// The single toggling card (Overhaul Phase 15) — /login is the canonical
// page for both modes; /register redirects here with ?mode=register so
// there's only ever one mounted instance, which is what makes the overlay
// slide a real animation instead of a page-reload jump cut.
export function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "register" ? "register" : "login");

  function switchMode(next: Mode) {
    setMode(next);
    const qs = new URLSearchParams();
    if (next === "register") qs.set("mode", "register");
    if (from) qs.set("from", from);
    const query = qs.toString();
    router.replace(`/login${query ? `?${query}` : ""}`, { scroll: false });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-10">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-surface shadow-xl">
        {/* Desktop: split card, sliding overlay */}
        <div className="relative hidden h-[560px] md:block">
          <div className="absolute inset-y-0 left-0 flex w-1/2 items-center justify-center p-10">
            <LoginFields from={from} />
          </div>
          <div className="absolute inset-y-0 right-0 flex w-1/2 items-center justify-center p-10">
            <RegisterFields from={from} />
          </div>
          <div
            className={`absolute inset-y-0 left-0 flex w-1/2 flex-col items-center justify-center gap-4 bg-primary px-10 text-center text-white transition-transform duration-500 ease-in-out motion-reduce:transition-none ${
              mode === "login" ? "translate-x-full" : "translate-x-0"
            }`}
          >
            {mode === "login" ? (
              <>
                <h2 className="text-2xl font-bold">New here?</h2>
                <p className="text-sm text-white/85">
                  Create an account and start shopping products from independent sellers across Vendora.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="rounded-md border border-white px-6 py-2 text-sm font-semibold hover:bg-white hover:text-primary"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Welcome back</h2>
                <p className="text-sm text-white/85">Log in to pick up your cart, orders, and wishlist.</p>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="rounded-md border border-white px-6 py-2 text-sm font-semibold hover:bg-white hover:text-primary"
                >
                  Log In
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile: single column, no split panel */}
        <div className="p-6 md:hidden">
          <div key={mode} className="animate-auth-fade">
            {mode === "login" ? <LoginFields from={from} /> : <RegisterFields from={from} />}
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => switchMode("register")} className="font-medium text-heading underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")} className="font-medium text-heading underline">
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

"use client";

import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

// Canonical page for both Login and Register (Overhaul Phase 15) — see
// AuthCard for why: keeping both modes as one mounted component is what
// makes the overlay slide a real animation instead of a page-reload jump.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthCard />
    </Suspense>
  );
}

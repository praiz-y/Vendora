"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// /register now just hands off to the single toggling card on /login
// (Overhaul Phase 15) — kept as a real redirect (not deleted) so existing
// links/bookmarks to /register still work. Forwards `from` if present so a
// guest redirected here mid-checkout still lands back where they were
// after signing up.
function RegisterRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const from = searchParams.get("from");
    const qs = new URLSearchParams({ mode: "register" });
    if (from) qs.set("from", from);
    router.replace(`/login?${qs.toString()}`);
  }, [router, searchParams]);

  return null;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterRedirect />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";

function readReducedMotionPreference(): boolean {
  return typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Shared by AnnouncementBar (Phase 2) and HeroCarousel (Phase 5) — both are
// auto-advancing content that WCAG 2.2.2/2.3.3 require a way to stop.
// Seeded via a lazy initializer (computed once during the initial render,
// not inside an effect) — this project's lint config flags any effect that
// synchronously calls setState in its own body; the effect below only ever
// sets state from its `change` listener callback, which is the allowed
// "subscribe to an external system" shape.
export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(readReducedMotionPreference);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}

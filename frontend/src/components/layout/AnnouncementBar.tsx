"use client";

import { useEffect, useState } from "react";
import { useAnnouncement } from "@/features/announcement/hooks";

const DISMISS_KEY = "vendora_announcement_dismissed";

// Read once, synchronously, as the initial state value (not inside an
// effect) — sessionStorage/matchMedia are both available synchronously on
// the client, so there's no need for an effect-plus-setState roundtrip just
// to seed state that's known at mount. `typeof window` guards the SSR pass.
function readDismissedMessage(): string | null {
  return typeof window === "undefined" ? null : sessionStorage.getItem(DISMISS_KEY);
}

function readReducedMotionPreference(): boolean {
  return typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AnnouncementBar() {
  const { data: announcement } = useAnnouncement();
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(readDismissedMessage);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(readReducedMotionPreference);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  if (!announcement || announcement.message === dismissedMessage) return null;

  const message = announcement.message;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, message);
    setDismissedMessage(message);
  }

  return (
    <div
      className="relative flex h-9 items-center overflow-hidden bg-primary text-white sm:h-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {reducedMotion ? (
        <p className="mx-auto max-w-[85%] truncate px-10 text-center text-sm font-medium">{message}</p>
      ) : (
        <div
          className="flex w-max flex-nowrap whitespace-nowrap text-sm font-medium"
          style={{
            animation: "marquee-scroll 24s linear infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          <span className="px-8">{message}</span>
          <span className="px-8" aria-hidden="true">
            {message}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

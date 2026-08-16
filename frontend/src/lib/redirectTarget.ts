// Shared by /login (Overhaul Phase 3) and /register (Phase 8, same bug,
// same fix) — validates a `?from=` query param before honoring it as a
// post-auth redirect target. Only a same-site relative path is accepted;
// anything else (an absolute URL, a protocol-relative "//evil.com", etc.)
// falls back to the default, so this can't be used as an open redirect.
export function resolveRedirectTarget(from: string | null, fallback = "/"): string {
  if (!from) return fallback;
  if (!from.startsWith("/") || from.startsWith("//")) return fallback;
  return from;
}

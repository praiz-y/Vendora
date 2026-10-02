// Server-only: where the Express API actually lives. The browser never
// talks to it directly — next.config.ts rewrites /api/* on this app's own
// origin to it, so the refresh cookie is first-party (SameSite=Lax keeps
// working across different production domains, and src/proxy.ts can see
// it to gate /account etc.). Server-side fetches (RSC pages, sitemap) have
// no origin to be relative to, so they call this URL directly.
const backendUrl = process.env.BACKEND_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const isServer = typeof window === "undefined";

if (isServer && !backendUrl && process.env.NODE_ENV !== "test") {
  console.warn(
    "BACKEND_URL is not set. Falling back to http://localhost:4000. Set it in .env.local for explicit configuration."
  );
}

if (!siteUrl && process.env.NODE_ENV !== "test") {
  console.warn(
    "NEXT_PUBLIC_SITE_URL is not set. Falling back to http://localhost:3000. Set it in .env.local for explicit configuration."
  );
}

export const env = {
  // Base for `${apiUrl}/api/v1/...`: same-origin (empty) in the browser,
  // the real backend on the server.
  apiUrl: isServer ? (backendUrl ?? "http://localhost:4000") : "",
  // The frontend's own public origin — used for metadataBase, canonical
  // URLs, sitemap.xml, and robots.txt.
  siteUrl: siteUrl ?? "http://localhost:3000",
};

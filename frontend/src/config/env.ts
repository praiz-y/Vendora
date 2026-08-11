const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!apiUrl && process.env.NODE_ENV !== "test") {
  console.warn(
    "NEXT_PUBLIC_API_URL is not set. Falling back to http://localhost:4000. Set it in .env.local for explicit configuration."
  );
}

if (!siteUrl && process.env.NODE_ENV !== "test") {
  console.warn(
    "NEXT_PUBLIC_SITE_URL is not set. Falling back to http://localhost:3000. Set it in .env.local for explicit configuration."
  );
}

export const env = {
  apiUrl: apiUrl ?? "http://localhost:4000",
  // The frontend's own public origin — used for metadataBase, canonical
  // URLs, sitemap.xml, and robots.txt. Deliberately separate from apiUrl:
  // frontend and backend are two independent apps that can live on
  // different origins in production.
  siteUrl: siteUrl ?? "http://localhost:3000",
};

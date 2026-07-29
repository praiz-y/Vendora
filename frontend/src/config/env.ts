const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl && process.env.NODE_ENV !== "test") {
  console.warn(
    "NEXT_PUBLIC_API_URL is not set. Falling back to http://localhost:4000. Set it in .env.local for explicit configuration."
  );
}

export const env = {
  apiUrl: apiUrl ?? "http://localhost:4000",
};

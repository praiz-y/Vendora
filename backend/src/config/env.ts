import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  // Prisma itself reads DATABASE_URL directly from the environment (see
  // schema.prisma's datasource block) — this copy is only for the app's
  // own fail-fast validation at boot, so a missing value surfaces as a
  // clear startup error instead of a confusing connection failure on the
  // first query.
  databaseUrl: required("DATABASE_URL"),
  frontendUrl: required("FRONTEND_URL", "http://localhost:3000"),
  jwt: {
    accessSecret: required(
      "JWT_ACCESS_SECRET",
      isProduction ? undefined : "dev-only-insecure-access-secret"
    ),
    refreshSecret: required(
      "JWT_REFRESH_SECRET",
      isProduction ? undefined : "dev-only-insecure-refresh-secret"
    ),
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? "15m",
  },
  refreshToken: {
    // days
    ttlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
    cookieName: "vendora_refresh_token",
  },
  guestCart: {
    // days — longer than the refresh token's default 30, since an
    // abandoned anonymous cart is lower-stakes than a session and still
    // worth honoring if the same browser comes back later.
    ttlDays: Number(process.env.GUEST_CART_TTL_DAYS ?? 90),
    cookieName: "vendora_guest_cart",
  },
  passwordReset: {
    ttlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30),
  },
  cookie: {
    // Cross-origin in dev (localhost:3000 <-> localhost:4000) still works
    // with SameSite=Lax since both share the "localhost" site. Secure is
    // forced on in production (requires HTTPS); left off in dev so the
    // cookie works over plain http://localhost.
    secure: isProduction,
    sameSite: (process.env.COOKIE_SAME_SITE as "lax" | "strict" | "none" | undefined) ?? "lax",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  payment: {
    secretKey: process.env.PAYMENT_SECRET_KEY,
    publicKey: process.env.PAYMENT_PUBLIC_KEY,
  },
};

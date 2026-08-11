import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 17 production hardening: don't advertise "X-Powered-By: Next.js"
  // on every response — no functional benefit to a would-be attacker
  // fingerprinting the stack, standard to turn off.
  poweredByHeader: false,
  turbopack: {
    root: path.join(__dirname),
  },
  // Phase 15 hardening: baseline security headers on every response. No
  // Content-Security-Policy here — this app's pages already run inline
  // styles/no third-party scripts, but a CSP tight enough to matter needs
  // careful per-page verification this pass didn't do; these four are
  // safe, standard, and don't risk breaking anything.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

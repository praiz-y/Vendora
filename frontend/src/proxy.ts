import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REFRESH_COOKIE_NAME = "vendora_refresh_token";

// UX-level gate only: redirects to /login if there's no refresh cookie at
// all. It cannot verify the cookie is still valid (that would require
// calling the backend from the edge), so a stale/invalid cookie still lets
// the request through — the account pages' client-side bootstrap
// (AuthProvider + useRequireAuth) and, ultimately, every backend endpoint's
// own authentication check are the real enforcement points.
//
// Named `proxy.ts` per Next.js 16's renamed convention (the older
// `middleware.ts` file name still works but is deprecated and logs a
// warning on every build/dev run — see
// https://nextjs.org/docs/messages/middleware-to-proxy).
export function proxy(request: NextRequest) {
  const hasRefreshCookie = request.cookies.has(REFRESH_COOKIE_NAME);

  if (!hasRefreshCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/seller/:path*", "/admin/:path*"],
};

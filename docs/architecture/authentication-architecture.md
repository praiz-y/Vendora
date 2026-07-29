# Vendora Authentication Architecture

This documents the Phase 2 authentication/authorization system: how login
sessions work end to end, how seller/admin authorization is decided, and the
security tradeoffs behind each choice.

## Overview

```text
User
  │
  ▼
POST /auth/register or /auth/login
  │
  ├── Access Token  (JWT, ~15 min, returned in JSON body)
  │
  └── Refresh Token (opaque random string, ~30 days)
        ├── Hash stored in Postgres (RefreshToken.tokenHash)
        └── Raw value set as an HttpOnly cookie (vendora_refresh_token)
```

```text
Login
  ↓
Credentials verified (generic error either way — no account enumeration)
  ↓
Access Token (JWT: { sub, role }, signed, 15m)
  +
Refresh Token (random 40-byte hex, hashed with SHA-256 before storage)
  ↓
RefreshToken row created (userId, tokenHash, expiresAt, userAgent, ipAddress)
  ↓
HttpOnly cookie set: vendora_refresh_token
```

## Why JWT access token + DB-backed refresh token + HttpOnly cookie

- The **access token** is a stateless JWT so most requests (the vast
  majority of API traffic) don't need a database round trip just to know who
  is asking — `authenticate()` only verifies a signature and reads `{ sub,
  role }` out of it.
- The **refresh token** is opaque (not a JWT) and backed by a real database
  row specifically so it can be **revoked** — a JWT refresh token would keep
  working until it expired no matter what the server did, which is
  incompatible with "log out", "log out everywhere", and reuse detection.
- Only a **hash** of the refresh token (`RefreshToken.tokenHash`, SHA-256) is
  ever stored — the raw value only exists in the HttpOnly cookie and briefly
  in memory on the server while issuing/rotating it. A stolen database dump
  cannot be turned back into usable sessions.

## Access Token Delivery

**Decision: JSON body + in-memory frontend storage + `Authorization: Bearer`
header.** Not a cookie.

Considered and rejected:
- **Access token as a cookie** — would need to be readable by client JS to
  attach it as a header anyway (defeating `HttpOnly`), or sent automatically
  by the browser (reintroducing CSRF concerns that a bearer-header design
  avoids entirely, since a plain cross-site `<form>` or `<img>` can't forge an
  `Authorization` header).
- **`localStorage`/`sessionStorage`** — explicitly ruled out by the phase
  spec (persistent, JS-readable, XSS-exposed).

What Vendora does instead:
- The access token lives only in a Zustand store (`frontend/src/stores/authStore.ts`)
  — **in memory, never persisted**. A hard page reload loses it.
- `frontend/src/lib/api/client.ts` attaches it as `Authorization: Bearer <token>`
  on every request.
- On page load, `AuthProvider` silently calls `POST /auth/refresh` (the
  HttpOnly cookie goes along automatically via `credentials: "include"`) to
  get a fresh access token before the user notices anything — see "Frontend
  Session Handling" below.

This keeps the JWT out of any JS-readable persistent storage while still
working cleanly across the Next.js frontend / Express backend split.

## Refresh Token Rotation & Reuse Detection

Every successful `POST /auth/refresh`:
1. Looks up the presented raw token by its hash.
2. If **not found** → `401 INVALID_REFRESH_TOKEN`.
3. If **expired** → `401 REFRESH_TOKEN_EXPIRED`.
4. If **already revoked** → treated as **token reuse** (see below).
5. If **valid** → the old row is marked `revokedAt` (linked via
   `replacedByTokenHash` to the new one) and a brand-new refresh token is
   issued. The response carries a new access token too.

```text
Access Token Expired
        ↓
POST /auth/refresh (HttpOnly cookie sent automatically)
        ↓
Look up RefreshToken by hash
        ↓
   ┌────┴────┐
   │         │
 valid    already revoked ──▶ REUSE DETECTED
   │              │
   ▼              ▼
Rotate:      Revoke ALL of this
revoke old,  user's refresh tokens
issue new    (full session wipe)
   │              │
   ▼              ▼
New access + refresh tokens   401 — must log in again
```

**Reuse detection**: if a refresh token that was already rotated away gets
presented again (e.g. an attacker replaying a stolen cookie after the
legitimate user already refreshed), that's a strong signal the token was
copied out-of-band. Vendora's response is to revoke **every** refresh token
for that user, not just the reused one — forcing a fresh login on every
device. This was verified directly in testing (see `tests/auth.test.ts`):
replaying an old token is rejected, and the token that replaced it is also
dead afterward.

## Cookie Configuration

| Attribute | Value | Why |
| --- | --- | --- |
| `HttpOnly` | always `true` | Never readable by JS, on either origin. |
| `Secure` | `true` in production, `false` in dev | Dev runs over plain `http://localhost`; production is expected to run over HTTPS. Driven by `NODE_ENV`, not hardcoded. |
| `SameSite` | `Lax` (env-configurable via `COOKIE_SAME_SITE`) | `localhost:3000` and `localhost:4000` are different **origins** but the same **site**, so `Lax` is sent on top-level navigations and same-site fetches — which covers this app's `credentials: "include"` fetches. |
| `Path` | `/` | **Not** scoped narrowly to `/api/v1/auth` — see the callout below, this was a real bug caught during Phase 2 testing. |
| `Expires` | matches `RefreshToken.expiresAt` (~30 days) | Cookie lifetime tracks the DB record's lifetime exactly. |

### Cookie `Path` — a bug found and fixed during this phase

The original design scoped the refresh cookie to `Path=/api/v1/auth` on the
theory that the browser should only attach it to the backend's own
login/refresh/logout calls, minimizing exposure. That is **incompatible**
with the Next.js proxy (`frontend/src/proxy.ts`) needing to see the cookie on
requests to `localhost:3000/account/*` — cookie `Path` matching is based
purely on the request's URL path, independent of host or port, so a cookie
scoped to `/api/v1/auth` is simply never sent on a request to `/account/profile`,
even on the "same site." This was caught by testing the full flow with a
shared cookie jar across both origins (simulating a real browser) rather than
testing each origin in isolation. The fix: widen `Path` to `/`. `HttpOnly`
already keeps the value unreadable by JS on both origins — widening `Path`
only changes which *requests* carry the cookie, not who can read it.

## Frontend Session Handling

```text
Page loads (access token is null — nothing survives a reload)
        ↓
AuthProvider (mounted once, in the root layout) fires on mount
        ↓
POST /auth/refresh — HttpOnly cookie sent automatically
        ↓
   ┌────┴────┐
   │         │
 succeeds   fails (no/expired/invalid cookie)
   │         │
   ▼         ▼
authStore:  authStore:
authenticated  unauthenticated
```

- **Concurrent 401s are deduped.** If several API calls fail with 401 at
  once (e.g. the access token expired while multiple queries were in
  flight), `frontend/src/lib/api/client.ts` shares a single in-flight
  `refreshPromise` — only one `POST /auth/refresh` goes out, and every
  pending request awaits the same result before retrying.
- **No infinite loop.** A request only triggers a refresh-and-retry if it
  actually carried an access token in the first place (`response.status ===
  401 && token && !skipAuthRefresh`) — a failed login/register (no token
  attached) never triggers a refresh attempt, and a retried request is
  marked `skipAuthRefresh` so it can fail at most once more without looping.
- **Refresh failure → logged out.** If `/auth/refresh` itself fails, the
  store moves straight to `unauthenticated` and `useRequireAuth` (used by
  `/account/*` pages) redirects to `/login`.

## Route Protection

```text
Backend (the real boundary):
  authenticate() → verifies JWT → 401 if missing/invalid
  requireAdmin() / requireActiveSeller() → 403 if the check fails
  Ownership checks → re-verified per request against the DB, never trusted from the URL

Frontend (UX convenience only):
  src/proxy.ts → redirects to /login if the refresh cookie is entirely absent
  useRequireAuth() → redirects to /login once the client-side session bootstrap
                      resolves to "unauthenticated"
```

The proxy can only check whether the cookie *exists* — verifying it's still
valid would mean calling the backend from the edge on every request, which
isn't worth the latency for what is ultimately a UX nicety. The backend's own
`authenticate()`/`requireAdmin()`/`requireActiveSeller()` middleware and every
ownership check are the actual security boundary, and were tested as such
(see `backend/tests/`).

## Authorization Model

```text
User
├── isAuthenticated()      — valid access token present
├── isAdmin()               — User.role === "ADMIN"
├── hasActiveSellerCapability(userId)
│     — LIVE query: does this user have a Store with status ACTIVE?
│     — NEVER read from the JWT — a store can be suspended at any moment,
│       and the access token has no way to know that until it's re-issued.
└── ownsResource(resourceOwnerId, user)
      — resourceOwnerId === user.id, checked after loading the actual
        resource from the DB (never trusts an id from the URL alone)
```

```text
User
│
├── Buyer capabilities — just being an authenticated USER
│
└── Seller capability — determined by Store, not by User.role
      │
      ├── No Store yet           → not a seller
      ├── Store.status ACTIVE    → seller functionality granted
      ├── Store.status SUSPENDED → seller functionality denied,
      │                            buyer functionality unaffected
      └── Store.status CLOSED    → seller functionality denied
```

`requireAdmin` and `requireActiveSeller` are separate, composable Express
middlewares (`backend/src/middlewares/authorize.ts`) applied **after**
`authenticate()` on any route that needs them — Phase 2 has no real
admin/seller feature route yet (those belong to later phases), so this was
verified with a small throwaway Express app inside the test suite
(`backend/tests/authorization.test.ts`) that mounts real
`authenticate → requireAdmin` / `authenticate → requireActiveSeller` chains
and hits them with real HTTP requests for every combination: unauthenticated,
plain buyer, active seller, suspended seller, and admin. A suspended seller
was explicitly verified to still succeed against a real buyer-facing route
(`GET /auth/me`).

## Password Reset

```text
POST /auth/forgot-password { email }
        ↓
Always the same generic response, whether or not the email exists
        ↓
   (if the account exists)
        ↓
Random reset token generated, SHA-256 hash stored (PasswordResetToken),
expires in 30 minutes
        ↓
sendPasswordResetEmail() — see "Email" below
        ↓
User opens {FRONTEND_URL}/reset-password?token=...
        ↓
POST /auth/reset-password { token, newPassword }
        ↓
Token looked up by hash; rejected if missing/expired/already used
        ↓
usedAt stamped (single-use) + password updated
        ↓
Every refresh token for that user revoked (all sessions logged out)
```

`PasswordResetToken` is a new, Phase-2-only table — Phase 1 only modeled
session tokens (`RefreshToken`); a reset token is genuinely different (much
shorter lifetime, strictly single-use, no rotation), so it got its own table
rather than overloading `RefreshToken`. See `.ai/reports/phase-2-report.md`
for the migration details.

### Email

No real email provider is integrated yet (deferred since Phase 0).
`backend/src/services/email.service.ts` is a small, explicit stand-in:
outside production it logs the reset URL to the server console so the flow
is actually testable locally; in production it does **not** pretend an email
was sent — it logs a warning so the gap is visible in server logs instead of
silently doing nothing. The HTTP response to the client is identical in both
cases, so this never leaks whether an account exists.

## Account Status & Suspension

- A user's own `User.status` (`ACTIVE` / `SUSPENDED`) is checked at **login**
  and at **refresh** — a suspended account can't log in, and an
  already-issued refresh token stops working the next time it's used (the
  refresh endpoint re-checks `User.status` and revokes the token if the
  account is no longer active).
- A short-lived access token issued just before suspension keeps working
  until it naturally expires (≤15 minutes) — a deliberate tradeoff for
  keeping `authenticate()` a fast, stateless JWT check rather than a
  per-request DB lookup. Login and refresh are the two points that are
  guaranteed to catch it.
- Suspension never deletes anything — historical orders, reviews, audit
  records, and digital entitlements all remain exactly as Phase 1 designed
  them to (see `docs/architecture/database-architecture.md`'s deletion
  strategy table).

## Security Summary

| Requirement | How it's met |
| --- | --- |
| Passwords never stored plaintext | `bcryptjs`, 10 salt rounds |
| Passwords never returned/logged | `SafeUser` never includes `passwordHash`; never logged anywhere |
| Refresh/reset/access tokens never logged | Only the dev-only reset-link console log exists, and only outside production |
| Access tokens short-lived, minimal claims | 15m, `{ sub, role }` only |
| Refresh tokens hashed, revocable, expiring, rotated | SHA-256 hash stored; `revokedAt`/`expiresAt`; rotation + reuse detection above |
| No account enumeration | Identical responses for login (bad password vs. no account) and forgot-password (exists vs. doesn't) |
| Rate limiting on sensitive endpoints | `express-rate-limit`, 20 req/15min, applied to register/login/refresh/forgot-password/reset-password only |
| Seller/admin authorization backend-enforced | `requireAdmin`/`requireActiveSeller` middleware; seller capability always re-checked live against `Store.status` |
| Ownership enforced server-side | Every address read/write re-verifies `address.userId === req.user.id`; mismatches return 404, not 403, to avoid confirming another user's resource exists |

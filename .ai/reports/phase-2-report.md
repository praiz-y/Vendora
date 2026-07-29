# Phase 2 Report — Authentication & User Accounts

Status: **Complete**. All items below were actually run/tested in this
environment, not just assumed to work.

## Before Making Changes

Reviewed `README.md`, `.ai/project-context.md`, `.ai/reports/phase-0-report.md`
and `phase-1-report.md`, `docs/architecture/database-architecture.md`, the
full `backend/prisma/schema.prisma`, `backend/src/app.ts`, and
`frontend/src/lib/api/client.ts` before writing any code. The three
"confirmed final" decisions in the phase brief (seller-as-capability,
separate Order/SellerOrder enums, stay on Prisma 6.x) matched what Phase 1
had already built — nothing needed to change to honor them; they're simply
respected by every new authorization check added this phase.

## What Was Completed

- Full authentication system: register, login (email or username), refresh
  (with rotation + reuse detection), logout, logout-all, current-user,
  forgot-password, reset-password, change-password.
- JWT access tokens (15 min, minimal `{ sub, role }` claims) + database-backed,
  hashed, rotating refresh tokens delivered via an `HttpOnly` cookie.
- Reusable authentication middleware (`authenticate`) and authorization
  primitives/middleware (`isAdmin`, `hasActiveSellerCapability`,
  `ownsResource`, `requireAdmin`, `requireActiveSeller`), kept structurally
  separate per the phase brief.
- User profile (view/update firstName/lastName/username) and address
  CRUD (create/list/update/delete/set-default), both ownership-checked
  server-side.
- Rate limiting on register/login/refresh/forgot-password/reset-password.
- Frontend: `/register`, `/login`, `/forgot-password`, `/reset-password`,
  `/account` (+ `/account/profile`, `/account/address`), in-memory access
  token via Zustand, silent-refresh session bootstrap, deduped
  refresh-and-retry on 401, and a Next.js proxy gate on `/account/*`.
- 39 automated backend tests (registration, login, refresh rotation/reuse,
  logout, password reset, change-password, and the full authorization
  matrix) plus extensive manual end-to-end verification against the real
  dev database and both dev servers.

## API Endpoints Implemented

```text
POST   /api/v1/auth/register          (rate-limited)
POST   /api/v1/auth/login             (rate-limited)
POST   /api/v1/auth/refresh           (rate-limited)
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all        (authenticated)
GET    /api/v1/auth/me                (authenticated)
POST   /api/v1/auth/forgot-password   (rate-limited)
POST   /api/v1/auth/reset-password    (rate-limited)
POST   /api/v1/auth/change-password   (authenticated)

GET    /api/v1/users/me               (authenticated)
PATCH  /api/v1/users/me               (authenticated)
GET    /api/v1/users/me/addresses     (authenticated)
POST   /api/v1/users/me/addresses     (authenticated)
PATCH  /api/v1/users/me/addresses/:id (authenticated, ownership-checked)
DELETE /api/v1/users/me/addresses/:id (authenticated, ownership-checked)
```

All match the spec's suggested list exactly; nothing extra was added.

## Frontend Routes Implemented

```text
/register
/login
/forgot-password
/reset-password        (reads ?token= from the query string)
/account                (redirects to /account/profile)
/account/profile        (profile edit + change-password)
/account/address         (list/create/set-default/delete)
```

`/account/*` is gated by `frontend/src/proxy.ts` (redirects to `/login` if no
refresh cookie is present at all) and, once inside, by
`useRequireAuth()`/`AuthProvider` on the client side. Both are UX
conveniences — the backend independently enforces authentication/authorization
on every request regardless of what the frontend does.

## Authentication Architecture

Full write-up with diagrams:
[`docs/architecture/authentication-architecture.md`](../../docs/architecture/authentication-architecture.md).
Summary: JWT access token (body → in-memory Zustand store → `Authorization`
header) + opaque, SHA-256-hashed, DB-backed refresh token (`HttpOnly` cookie,
`Path=/`, `SameSite=Lax`, `Secure` in production only). Refresh rotates on
every use; presenting an already-rotated token is treated as reuse/theft and
revokes every session for that user.

## Authorization Architecture

- `authenticate` (backend/src/middlewares/authenticate.ts) verifies the JWT
  and attaches `{ id, role }` to `req.user`. Nothing about
  seller/admin/ownership is decided here.
- `requireAdmin` / `requireActiveSeller`
  (`backend/src/middlewares/authorize.ts`) are separate, composable
  middlewares applied after `authenticate` wherever needed.
- `isAdmin`, `hasActiveSellerCapability`, `ownsResource`
  (`backend/src/utils/authz.ts`) are the underlying, directly-testable
  primitives. `hasActiveSellerCapability` is **always** a live
  `Store.status` query — never read from the JWT.
- Ownership (addresses) is re-verified server-side on every read/write by
  loading the resource and comparing `resource.userId === req.user.id`;
  mismatches return `404`, not `403`.

## Seller Capability Authorization Approach

Confirmed and implemented exactly as finalized in the phase brief: seller
access is `User` + an associated `Store` with `status === "ACTIVE"`, checked
fresh from the database on every request that needs it — never cached in the
JWT, never represented as a `User.role` value. Verified with a full matrix
in `backend/tests/authorization.test.ts`:

| Actor | Admin-only route | Seller-only route | Buyer route (`/auth/me`) |
| --- | --- | --- | --- |
| Unauthenticated | 401 | 401 | 401 |
| Plain buyer (no store) | 403 | 403 | 200 |
| Approved/active seller | 403 | 200 | 200 |
| Suspended seller (Store.status=SUSPENDED) | 403 | 403 | **200** |
| Admin (no store) | 200 | 403 | 200 |

The suspended-seller row is the one the phase brief called out specifically
— confirmed a suspended seller keeps full buyer/account access while losing
seller-only access.

Since Phase 2 intentionally has no real admin/seller feature route to protect
yet (that's later phases), `requireAdmin`/`requireActiveSeller` were verified
against a small throwaway Express app mounted inside the test suite that
wires up the real middleware — not by mocking `req`/`res` by hand, and not
skipped just because there's no production route yet.

## Session Management Implementation

- `RefreshToken` (Phase 1 model, used as designed): one row per session,
  `tokenHash` unique, `expiresAt`, `revokedAt`, `replacedByTokenHash` for
  rotation traceability.
- Logout revokes the current session's token. Logout-all
  (`POST /auth/logout-all`) revokes every non-revoked token for the user —
  the "all sessions" support the phase brief asked for as a foundation.
- Password reset and password change both revoke **every** session for the
  user (the "safer approach" the brief explicitly asked for when in doubt).
- No session-list/session-management UI was built — out of scope per the
  brief ("do not build the full session-management UI unless necessary for
  Phase 2"); the backend foundation (multiple `RefreshToken` rows per user,
  each independently revocable) is what a future UI would read from.

## Password Reset Implementation

`PasswordResetToken` (new table, see "Schema Changes" below): random token,
SHA-256 hash stored, 30-minute expiry, single-use (`usedAt` stamped on
consumption). `forgot-password` always returns the same message regardless
of whether the email exists — verified directly in tests. No real email
provider exists yet (deferred since Phase 0), so
`backend/src/services/email.service.ts` logs the reset URL to the console
outside production and logs a warning (not a fake "sent" claim) in
production. This is a known, intentional gap — see "Anything Intentionally
Deferred."

## Security Measures Implemented

See the full checklist in
`docs/architecture/authentication-architecture.md#security-summary`. In
short: bcrypt password hashing (never logged/returned), short-lived
minimal-claim JWTs, hashed/revocable/expiring/rotating refresh tokens,
generic login/forgot-password responses (no account enumeration), rate
limiting on sensitive endpoints, `HttpOnly`+environment-aware `Secure`+
`SameSite=Lax` cookies, and server-enforced seller/admin/ownership checks
that never trust the frontend.

## Tests Performed And Their Results

**Automated** (`cd backend && npm test` — vitest + supertest against a
dedicated `vendora-postgres-test` container, port 5435, migrated with the
same 3 migrations as the dev database): **39/39 passing**, covering:

- Registration: valid registration (+ cart auto-created), case-insensitive
  duplicate email, duplicate username, invalid input (422), weak password
  (422), and a genuine concurrent-request race on the same email (asserts
  exactly one 200 + one 409, and exactly one row in the DB — proving the
  database constraint is the real enforcement point, not a pre-check).
- Login: correct credentials (email and username), incorrect password,
  nonexistent account (identical error to incorrect password), suspended
  account (403, only after password verification succeeds).
- Refresh: success + rotation, missing token, garbage/invalid token, expired
  token, directly-revoked token, and full reuse-detection (replaying an old
  token is rejected *and* the token that replaced it is also dead
  afterward).
- Logout: clears the session (subsequent refresh fails); forgiving when
  there's no session to log out of.
- `/auth/me`: rejects unauthenticated, returns the right user when
  authenticated.
- Password reset: identical response for known/unknown email, full
  reset-then-login-with-new-password flow, reuse of a consumed token
  rejected, expired token rejected, unknown token rejected, and confirms
  existing sessions are invalidated by a reset.
- Change-password: wrong current password rejected; correct change
  invalidates the session and allows login with the new password.
- Authorization: `isAdmin`/`ownsResource` unit behavior;
  `hasActiveSellerCapability` reflects live DB state (flips when the store's
  status is updated, not cached); the full admin/seller/buyer matrix table
  above, via real HTTP requests through the real middleware.
- Ownership: a second user gets `404` (not `403`) attempting to
  read/update/delete another user's address, and the address is confirmed
  unmodified in the database afterward; a profile-update request cannot
  smuggle in a `role`/`status` change.
- Rate limiting: isolated unit test of the underlying
  `express-rate-limit` + response-envelope wiring (the shared app's real
  limiter is skipped under `NODE_ENV=test` so it doesn't throttle the test
  run itself — that real limiter was separately, manually verified live
  against the dev server, see next section).

**Manual, end-to-end** (real dev servers, real `vendora-postgres` dev
database, real HTTP via `curl`): registration → login → `/auth/me` →
duplicate-email/username rejection → wrong-password/nonexistent-account
rejection → weak-password 422 → refresh rotation → replay-detection (and
confirmed the *newly rotated* token was also killed by the detection) →
logout → refresh-after-logout rejection → forgot-password (existing and
nonexistent email, identical response) → dev-console reset link → reset →
single-use enforcement → old-password rejected/new-password accepted →
change-password (wrong current password rejected, correct change accepted)
→ session invalidated after change → address create/list/update/delete →
cross-user address ownership rejection (404) → profile update →
protected-field-injection rejection → suspended-account login rejection
(via a temporary direct DB update, reverted afterward) → **hit the real rate
limiter by accident** during this testing (confirms it works; the dev
server was restarted to clear it, which is how the `NODE_ENV=test` skip in
the automated suite was decided on) → address delete blocked with `409`
when the address is referenced by a Phase 1 seeded historical order
(confirms the Phase 1 `onDelete: Restrict` on `Order.shippingAddressId`
integrates correctly with Phase 2's error handling).

**Frontend**: `tsc --noEmit` clean, ESLint clean, production build clean (all
9 new routes generated, `Proxy (Middleware)` route present). Verified via
HTTP requests to the dev server (no browser available in this environment):
`/register` and `/login` return 200; `/account/profile` redirects to
`/login?from=...` with no session cookie and returns 200 once a valid
session cookie is present — this was tested with a **shared cookie jar across
both the backend and frontend origins** to genuinely simulate a browser,
which is how the `Path` bug below was caught.

## Schema Changes

One addition, exactly as the phase brief's process requires (explain why →
smallest change → migration → re-verify → document):

- **Why**: Phase 1 modeled session tokens (`RefreshToken`) but had no
  structure for password-reset tokens, which the phase brief's forgot-password
  flow genuinely needs (short-lived, single-use, no rotation — different
  enough from a session that overloading `RefreshToken` would be confusing).
- **Change**: added `PasswordResetToken` (`id`, `userId`, `tokenHash` unique,
  `expiresAt`, `usedAt`, `createdAt`) with a `Cascade` delete from `User`
  (a reset token has no meaning independent of its user) and a back-relation
  on `User`.
- **Migration**: `add_password_reset_token` — additive only (new table, no
  column drops/type changes on existing tables), applied cleanly to both the
  dev and test databases without needing the destructive-action consent flow
  Phase 1 required for its schema reset.
- **Re-verification**: the full automated suite (which exercises this table
  directly — issue, consume, expire, reuse-reject) passed; the existing
  Phase 1 schema and its 28 original integrity checks were not touched or
  re-run since nothing about them changed.
- No other schema changes were made. `phone`/`avatar` fields for the user
  profile (mentioned conditionally in the phase brief — "if supported by
  existing schema") were deliberately **not** added, since they weren't in
  the Phase 1 schema and adding them wasn't a genuine requirement (`Address`
  already carries a `phone` for shipping purposes); profile editing in this
  phase covers `firstName`/`lastName`/`username` only.

## Two Bugs Found And Fixed During This Phase (not pre-existing failures — caught before shipping)

1. **`middleware.ts` was in the wrong location and (separately) is a
   deprecated filename.** Phase 0 placed it at `frontend/middleware.ts`, but
   this project uses a `src/` layout, where Next.js expects
   `src/middleware.ts` — it was silently inert the whole time since it was
   only ever a no-op placeholder. While fixing that, `next build` further
   revealed Next.js 16 has renamed the convention to `src/proxy.ts` with an
   exported function named `proxy` (not `middleware`); `middleware.ts` still
   works but logs a deprecation warning on every build. Moved to
   `src/proxy.ts` with the corrected export name; confirmed no deprecation
   warning and the redirect behavior works via direct HTTP testing.
2. **Refresh cookie `Path` was too narrow to be checked cross-origin.** It
   was originally scoped to `/api/v1/auth` (intended to minimize which
   requests carry it). That is incompatible with `src/proxy.ts` needing to
   read the cookie on requests to `localhost:3000/account/*` — cookie `Path`
   matching is purely about the request's URL path, independent of host or
   port, so a `/api/v1/auth`-scoped cookie set by the backend is never sent
   on a request to `/account/profile` even though both are "localhost."
   Caught by testing with one shared cookie jar across both dev servers
   (simulating a real browser) rather than testing each origin in isolation.
   Fixed by widening `Path` to `/` — `HttpOnly` already keeps the value
   unreadable by JS regardless of `Path`, so this only changes which
   *requests* carry the cookie, not who can read its value.

Both are documented in `docs/architecture/authentication-architecture.md`
and `.ai/project-context.md` so the reasoning isn't lost.

## Unresolved Issues

None blocking. Two known, intentional gaps (see below) rather than defects.

## Anything Intentionally Deferred

- **Real email provider.** Password reset works end-to-end in development
  via a console-logged link; in production, no email actually goes out yet
  (a warning is logged server-side instead of a false "sent" claim). Wiring
  an actual provider is out of scope until one is chosen (still marked
  "planned, not yet integrated" since Phase 0).
- **Email address changes / email verification** — not implemented at all.
  The phase brief explicitly flagged this as something to handle carefully
  given no verification flow exists yet; the simplest safe choice was to not
  allow email changes this phase rather than ship an unverified one.
- **Session-list/management UI** — the backend foundation (multiple
  independently-revocable `RefreshToken` rows per user, `logout-all`) exists;
  no UI surfaces it, per the brief's "do not build unless necessary" guidance.
- **Prisma 7 upgrade** — still deferred, per this phase's explicit "Decision
  3."
- **Avatar/phone on `User`** — not added; see "Schema Changes" above.

## Decisions Requiring Review Before Phase 3

- None of the three pre-confirmed decisions needed revisiting — they held up
  through implementation and testing without friction.
- Worth a conscious choice before building on top of it: profile updates
  currently only cover `firstName`/`lastName`/`username`. If a future phase
  needs email changes or an avatar, that's a deliberate new decision (with
  a verification-flow question attached for email), not an oversight to
  silently patch.

# Vendora — Project Context

This file is the source of truth for what Vendora is, what has been built so far,
and what rules future development (including AI-assisted development) must follow.
Keep it up to date at the end of every phase.

## Purpose

Vendora is a multi-vendor e-commerce marketplace portfolio project. Key product
behaviors agreed on for V1:

- Everyone registers as a **buyer** by default. A buyer can apply to **become a
  seller**; becoming a seller does not remove buyer capabilities — a seller can
  still browse and purchase like any buyer.
- Admins verify seller applications and verify products before they go public.
- A single checkout can contain products from multiple sellers at once
  (multi-vendor cart/order).
- Payments: integrate a real NGN payment provider if feasible; otherwise simulate
  payment for portfolio purposes. The provider is not finalized yet, so the
  architecture must not be tightly coupled to one payment provider.
- Product lifecycle: `DRAFT → PENDING_REVIEW → APPROVED` (or `REJECTED`, editable
  and resubmittable) `→ ARCHIVED`.
- Order lifecycle (agreed baseline): `PENDING_PAYMENT → PAID → PROCESSING →
  SHIPPED → DELIVERED`, or `CANCELLED`.
- Seller dashboard covers: Dashboard, Products, Orders, Analytics (views, sales,
  revenue), Reviews, Profile, Payouts (future).

## Current Tech Stack

**Frontend** — `frontend/`
- Next.js (App Router), TypeScript, Tailwind CSS
- TanStack Query for server-state/data fetching (`QueryProvider` wired in root layout)
- Zustand for the in-memory auth session (`src/stores/authStore.ts` — the
  one genuinely-needed use case: cross-component access-token/user state)
- Zod available for client-side schema validation

**Backend** — `backend/`
- Node.js + Express, TypeScript
- Zod for request validation (`src/middlewares/validate.ts` — a generic
  `validate(schema, target)` factory, now used by every auth/user route)
- Layered structure: `routes → controller → service → Prisma → PostgreSQL`
  (`src/config/prisma.ts` exports the shared `PrismaClient` singleton)
- `src/modules/auth/`, `src/modules/users/`, `src/modules/sellerApplications/`
  (+ its `admin/` sub-module), `src/modules/stores/` — feature modules built
  on top of the Phase 0/1 foundation
- `src/utils/auditLog.ts` — shared `recordAuditLog()`, the one entry point
  for writing `AuditLog` rows (Phase 3)

**Database**
- PostgreSQL
- Prisma ORM — full Phase 1 domain schema in `backend/prisma/schema.prisma`
  (see [`docs/architecture/database-architecture.md`](../docs/architecture/database-architecture.md))

**Authentication** (Phase 2 — complete)
- JWT access tokens (15m, `{ sub, role }` only) + DB-backed, hashed, rotating
  refresh tokens in an `HttpOnly` cookie. Full design in
  [`docs/architecture/authentication-architecture.md`](../docs/architecture/authentication-architecture.md).
- `bcryptjs` for password hashing, `jsonwebtoken` for access tokens,
  `express-rate-limit` on sensitive auth endpoints.

**Planned, not yet integrated**
- Cloudinary (image storage)
- A payment provider (NGN) — architecture must stay provider-agnostic
- A real email provider (password reset currently uses a dev-only console-log stand-in)

## High-Level Architecture

```text
Next.js Frontend (frontend/)
        │  HTTP API (fetch via src/lib/api/client.ts)
        ▼
Express Backend (backend/)
        │
        ▼
Prisma ORM (backend/prisma/schema.prisma)
        │
        ▼
PostgreSQL
```

All backend endpoints are versioned under `/api/v1`. All API responses follow a
consistent envelope (see "API Response Format" below).

## Current Development Phase

**Phase 3: Admin Foundation + Seller Onboarding, Stores & Dashboard Shells —
complete.** See [`.ai/reports/phase-3-report.md`](reports/phase-3-report.md)
for what was actually built and verified (Phase 0: `phase-0-report.md`,
Phase 1: `phase-1-report.md`, Phase 2: `phase-2-report.md`). Phase 4 starts
next, pending direction from the user — this project explicitly stops at the
end of each phase for review.

**Full phase breakdown**: see
[`docs/roadmap.md`](../docs/roadmap.md) — the authoritative phase-by-phase
plan (supersedes the phase list in `docs/architecture/Overview.md` section
42). Phase 3 was restructured there to pull a thin Admin Foundation and
Seller Dashboard shell forward, since seller/product/report/refund approval
all need an admin actor well before the old plan's Phase 12 "Admin
Dashboard." Phase *numbers* elsewhere are unchanged.

## Important Architectural Decisions

- **Monorepo, two independent apps.** `frontend/` and `backend/` have their own
  `package.json`/`node_modules`/`tsconfig.json`. The root `package.json` only
  orchestrates running both together (`concurrently`) — it is not an npm
  workspaces setup, since that wasn't needed for two independent apps.
- **API response envelope** (`backend/src/utils/apiResponse.ts`):
  - Success: `{ success: true, message, data }`
  - Error: `{ success: false, message, error: { code, details? } }`
  - Errors are raised as `ApiError` (`backend/src/utils/ApiError.ts`) and handled
    by one centralized `errorHandler` middleware — controllers/services should
    throw `ApiError`, not build responses by hand.
- **CORS** is driven by `FRONTEND_URL` env var, not a hardcoded origin.
- **Backend port is 4000**, not the Express default 5000 — port 5000 was already
  occupied by an unrelated local process during setup. Reflected in
  `backend/.env(.example)`, `frontend/.env.local(.example)`, and README.
- **Local Postgres runs in a dedicated Docker container** `vendora-postgres` on
  host port `5434` (ports 5432/5433 were already in use by other local projects'
  Postgres containers). This is a local dev convenience, not a production
  decision — `DATABASE_URL` is fully configurable.
- **No path aliases in the backend.** The frontend uses `@/*` (works fine — Next
  resolves it via SWC/webpack/Turbopack). The backend uses plain relative
  imports instead of `@/*`, because `tsx`/ts-node-style runtners resolving
  tsconfig `paths` at runtime is an added point of failure that wasn't worth it
  for a thin Express app.
- **Frontend API client** (`frontend/src/lib/api/client.ts`) is a single fetch
  wrapper (`apiClient.get/post/put/patch/delete`) that always sends
  `credentials: "include"` (needed later for the HttpOnly refresh-token cookie)
  and unwraps the backend's response envelope, throwing a typed `ApiError` on
  failure. It does not yet implement auth/refresh-token retry logic — that's a
  Phase 2+ concern once auth exists.
- **`frontend/src/app/dev/health`** is an intentionally-kept development page
  (not linked from any nav) that exercises the full
  `browser → Next.js → Express → /api/v1/health → response` path via TanStack
  Query. Useful for verifying the stack still talks to itself after future
  changes; not part of the production marketplace UI.
- **Prisma schema is being built in phases.** Phase 0 shipped a throwaway
  `HealthCheck` model purely to prove Prisma ↔ PostgreSQL connectivity
  (migration `init_health_check`). Phase 1 replaced it entirely with the real
  domain schema (migrations `init_domain_schema` +
  `product_report_partial_unique`) — see
  [`docs/architecture/database-architecture.md`](../docs/architecture/database-architecture.md)
  for the full design and reasoning.
- **Seller status is a capability, not a role.** `User.role` is only
  `USER`/`ADMIN`. An approved seller is a `User` with a 1:1 `Store` — nothing
  about their role changes, so they keep buying like any other user. See the
  architecture doc's "Users, roles, and seller status" section.
- **Multi-vendor orders**: one `Order` → many `SellerOrder` (one per
  seller involved) → many `OrderItem`. `Order.status` is a coarser enum with
  `PARTIALLY_*` states than `SellerOrder.status`, specifically to represent
  "one seller shipped, another is still processing" at the aggregate level.
  Verified in Phase 1 testing that a multi-vendor checkout is one `Order` row,
  not duplicated per seller.
- **Order line items are fully snapshotted** (`OrderItem.productNameSnapshot`,
  `priceSnapshot`, etc.) so editing a `Product` later never changes historical
  order data — verified directly in Phase 1 testing.
- **Digital entitlements resolve to the latest version dynamically** (query
  `MAX(version)` on `DigitalProductVersion`), not via a stored `isLatest` flag
  or a per-version entitlement row.
- **"One active product report per user per product"** is enforced with a
  hand-written partial unique index (`WHERE status = 'PENDING'`) since Prisma's
  schema syntax can't express conditional uniqueness — see migration
  `product_report_partial_unique`.
- **Every historically-significant relation has a deliberately chosen
  `onDelete`** (`Restrict` for anything tied to orders/payments/entitlements,
  `SetNull` for admin-reviewer references, `Cascade` only for genuinely
  ephemeral/structural-child data). Full table in the architecture doc.
- **Seed data is fully idempotent** (`backend/prisma/seed.ts` wipes and
  re-inserts) and uses one shared dev-only password (`VendoraDev123!` by
  default, overridable via `SEED_USER_PASSWORD`) hashed with `bcryptjs`.
- **`PasswordResetToken` (Phase 2 schema addition)** — the only schema change
  made this phase. Phase 1 modeled session tokens (`RefreshToken`) but not
  reset tokens; a reset token is genuinely different (much shorter lifetime,
  strictly single-use, no rotation), so it's its own table rather than
  overloading `RefreshToken`. Migration: `add_password_reset_token`.
- **Seller status stays a capability, not a role** (confirmed/finalized in
  Phase 2). `hasActiveSellerCapability(userId)` always queries `Store.status`
  live from the database — it is never read from or cached in the JWT, since
  a store can be suspended at any moment and a stale token shouldn't be able
  to out-live that.
- **Access token delivery: JSON body → in-memory Zustand store → `Authorization: Bearer` header.**
  Not a cookie, and not `localStorage`/`sessionStorage`. Full reasoning in
  the authentication architecture doc's "Access Token Delivery" section.
- **Refresh cookie `Path` is `/`, not `/api/v1/auth`.** Originally scoped
  narrowly to the backend's own auth routes to minimize exposure, but that
  broke the Next.js proxy's ability to see the cookie when deciding whether
  to gate `/account/*` (cookie `Path` matching is based on the request path,
  independent of host/port — a `/api/v1/auth`-scoped cookie is never sent on
  a request to `/account/profile`). Found via testing with a shared cookie
  jar across both origins, not by testing each origin in isolation. `HttpOnly`
  still keeps the value unreadable by JS either way.
- **`middleware.ts` → `src/proxy.ts`.** Two corrections to Phase 0's
  placeholder: (1) with a `src/` layout, Next.js expects the file at
  `src/middleware.ts`, not the project root — the Phase 0 file was in the
  wrong place and silently did nothing since it was a no-op anyway; (2)
  Next.js 16 has renamed the convention from `middleware.ts`
  (deprecated, still works but warns) to `proxy.ts` with an exported
  function named `proxy`, not `middleware`. Both were only discovered once
  the file needed to do real work in Phase 2.
- **Refresh-token reuse is treated as theft**: presenting an
  already-rotated-away refresh token revokes every refresh token for that
  user (not just the reused one), forcing re-login on every device. Verified
  directly in `backend/tests/auth.test.ts`.
- **A password reset or change-password revokes every session for that
  user**, including the one making the change-password request — the safer
  default the phase spec asked for, over preserving the current session.
- **Validation errors return `422`**, not `400` (`backend/src/middlewares/validate.ts`,
  via `ApiError.unprocessable`) — matches this phase's expected status-code
  list. `400` is reserved for non-schema request problems (e.g. an invalid
  password-reset token).
- **Ownership violations return `404`, not `403`** (e.g. acting on another
  user's address by id) — doesn't confirm the resource exists under someone
  else's account.
- **Automated backend tests run against a second, dedicated Postgres
  container** (`vendora-postgres-test`, port 5435) — not the dev database —
  via `backend/.env.test` and `vitest` + `supertest`. `npm test` from
  `backend/` runs the suite (58 tests as of Phase 3).
- **Store slugs are generated once, at approval, and never regenerated on
  rename** (`stores.service.generateUniqueStoreSlug`, called only from the
  admin approve flow). Marketplace/store URLs (Phase 5) will depend on slug
  stability — regenerating it on every rename would silently break links.
- **`SellerApplication` and `Store` intentionally keep separate field names**
  (`storeName` vs `name`, `storeDescription` vs `description`, etc.) — this
  was already how Phase 1 modeled the two tables. Approval copies the
  application's fields across; the two don't share a validation schema.
- **Editing a `REJECTED` seller application resubmits it in place** (back to
  `PENDING`, clearing `rejectionReason`/`reviewedById`/`reviewedAt`) rather
  than creating a new row — there's only ever one `SellerApplication` per
  user (`@unique` on `userId`, from Phase 1). Editing a `PENDING` one just
  updates fields; an `APPROVED` one is immutable (its `Store` is what gets
  edited from then on).
- **`recordAuditLog(client, input)` (`backend/src/utils/auditLog.ts`) is the
  one entry point for writing to `AuditLog`.** Accepts either the shared
  Prisma client or an active transaction client, so the audit entry commits
  atomically with the state change it records (used by seller-application
  approve/reject). Every later admin action (product moderation, refunds,
  suspensions, ...) should call this rather than writing to `AuditLog` by
  hand.
- **The Admin Foundation (`/admin`) and Seller Dashboard (`/seller`) shells
  are deliberately thin as of Phase 3**: gated layout + nav, and (for admin)
  one reusable list/detail/approve-reject pattern, first built against
  seller-application review. Every later phase that needs an admin or seller
  screen (product moderation, seller Orders/Reviews/Analytics tabs, report
  review, refund review) adds one more entry onto these existing shells —
  see `docs/roadmap.md` — instead of building its own one-off tooling.

## Development Rules

- Do not build feature UI (marketplace, cart/checkout, product moderation,
  seller-dashboard tabs beyond Profile, admin screens beyond seller-application
  review) until the phase that owns it — see `docs/roadmap.md`.
- Do not integrate real payments yet; keep the schema/architecture provider-agnostic.
- Prefer archival/status fields over destructive deletes for anything involved
  in historical transactions (products, orders, order items, payments, refunds,
  digital entitlements).
- Keep controllers thin; business logic belongs in services, DB access in Prisma.
- All new backend input handling should go through Zod validation middleware,
  not ad hoc checks in controllers.
- Seller/admin authorization: use `requireAdmin`/`requireActiveSeller`
  (`backend/src/middlewares/authorize.ts`) or the underlying
  `isAdmin`/`hasActiveSellerCapability`/`ownsResource` helpers
  (`backend/src/utils/authz.ts`) — never re-derive these checks ad hoc, and
  never decide seller access from `User.role` or from JWT contents.
- Any new authenticated route goes through `authenticate`
  (`backend/src/middlewares/authenticate.ts`) first; authorization is always a
  separate, composed step after it, never folded into it.
- New resource endpoints that belong to a specific user must re-verify
  ownership server-side after loading the resource (see
  `backend/src/modules/users/addresses.service.ts`'s
  `getOwnedAddressOrThrow` for the pattern) — never trust an id from the URL.

## What Has Been Completed

- **Phase 0**: monorepo scaffold, Next.js app, Express app, API response
  envelope, centralized error handling, `/api/v1/health`, CORS, Prisma wired to
  Postgres with a minimal verification model/migration, root dev scripts, env
  examples, docs. Full details in `.ai/reports/phase-0-report.md`.
- **Phase 1**: complete Prisma domain schema (users/auth foundation, seller
  applications/stores, categories, products incl. images/digital
  versions/views, cart/wishlist, multi-vendor orders, payments/attempts, stock
  reservations, refunds, digital entitlements, reviews, product reports,
  notifications, audit logs); two migrations applied against the dev
  database; idempotent seed script; layered backend utilities
  (`prisma.ts` singleton, `validate.ts` Zod middleware, `asyncHandler.ts`,
  `pagination.ts`); 28 relationship/business-rule checks verified against the
  seeded data. Full details in `.ai/reports/phase-1-report.md`.
- **Phase 2**: full auth system (register/login/refresh/logout/logout-all,
  forgot/reset/change password), JWT + rotating hashed refresh tokens in an
  `HttpOnly` cookie, `authenticate`/`requireAdmin`/`requireActiveSeller`
  middleware, ownership-checked user profile + address CRUD, rate limiting on
  auth endpoints, `PasswordResetToken` schema addition, 39 automated backend
  tests (vitest + supertest against a dedicated test database), and the
  frontend register/login/forgot-password/reset-password/account pages with
  in-memory-token session handling. Full details in
  `.ai/reports/phase-2-report.md`.
- **Phase 3**: Admin Foundation (shared `recordAuditLog` util, gated `/admin`
  shell, reusable list/detail/approve-reject pattern) and Seller Dashboard
  shell (gated `/seller` layout with Dashboard/Products/Orders/Analytics/
  Reviews/Profile nav, only Profile implemented); full seller-application
  lifecycle (submit/edit/resubmit, admin list/filter/detail/approve/reject);
  `Store` CRUD for approved sellers with a slug generated once at approval;
  the buyer-facing `/account/selling` "Become a Seller" flow covering all
  four application states; `proxy.ts` extended to gate `/seller/*` and
  `/admin/*`; 19 new automated backend tests (58 total). Full details in
  `.ai/reports/phase-3-report.md`, including a flagged gap: the new UI was
  verified via API calls and page-render checks, not a full browser
  click-through (Playwright's Chromium download stalled in this sandbox).

## What Should Not Be Implemented Yet

- Product creation, product moderation, marketplace/browse/search pages,
  store public pages (Phase 4/5)
- Cart, wishlist, and checkout UI (the cart/wishlist *data model* already
  exists from Phase 1 — only the UI/flow is out of scope so far)
- Real payment processing
- The seller dashboard's Products/Orders/Analytics/Reviews tabs (placeholders
  only as of Phase 3 — Phases 4/8/11/10 fill them in) and the Admin Dashboard
  Polish phase's overview/audit-log/user-management screens (Phase 14)
- Reports, notifications UI
- Cloudinary image upload — store/seller-application logo and banner fields
  are plain URL text inputs for now, not file uploads
- Email verification for email address changes (email changes aren't
  implemented at all yet — see the authentication architecture doc)
- A real email provider integration (password reset uses a dev-only
  console-log stand-in — see `backend/src/services/email.service.ts`)
- Anything beyond what the current phase's report says is done

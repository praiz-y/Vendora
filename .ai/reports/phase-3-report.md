# Phase 3 Report — Admin Foundation + Seller Onboarding, Stores & Dashboard Shells

Status: **Complete**.

This phase follows [`docs/roadmap.md`](../../docs/roadmap.md)'s restructured
Phase 3, which pulls a thin Admin Foundation and Seller Dashboard shell
forward (originally Phase 12/11 in `docs/architecture/Overview.md`) since
seller approval needs an admin actor immediately, not after eight more
phases.

## Before Making Changes

Reviewed `docs/roadmap.md`'s Phase 3 entry, `.ai/project-context.md`, the
Phase 0/1/2 reports, `docs/architecture/database-architecture.md`, the full
`backend/prisma/schema.prisma` (`SellerApplication`/`Store` models were
already fully designed in Phase 1 — no schema changes needed this phase),
and every Phase 2 backend/frontend file (`authz.ts`, `authorize.ts`,
`validate.ts`, `ApiError`, `apiResponse`, `pagination`, the `users` module,
`authStore.ts`, `client.ts`, `proxy.ts`, the account pages) as the pattern
every new module and page in this phase follows.

## What Was Completed

- **Admin Foundation**: a shared `recordAuditLog` util (accepts the plain
  Prisma client or an active transaction client), a `requireAdmin`-gated
  `/admin` layout + nav, and a reusable list → detail → approve/reject
  pattern — first built against seller-application review, intended to be
  reused (not reinvented) by product moderation, report review, and refund
  review in later phases.
- **Seller application lifecycle** (buyer-facing): submit, view own
  application, edit — editing a `REJECTED` application resubmits it (back to
  `PENDING`, clearing the prior rejection reason/reviewer), editing a
  `PENDING` one just updates fields in place, and an `APPROVED` application
  is immutable (the `Store` it produced is what's edited from then on).
- **Admin seller-application review**: list with status filter + pagination,
  detail view (includes applicant identity), approve (creates an `ACTIVE`
  `Store` from the application's data in the same transaction, with a
  generated unique slug) and reject (with a required reason), both writing an
  audit log entry.
- **Store module** (seller-facing, gated by `requireActiveSeller`): view/
  update store profile. Suspending a seller's store immediately blocks
  `/stores/me` (live `Store.status` check, same pattern as Phase 2's
  `requireActiveSeller`) while leaving their buyer functionality untouched.
- **Seller Dashboard shell**: a gated `/seller` layout with
  Dashboard/Products/Orders/Analytics/Reviews/Profile nav. Only **Profile**
  (store info edit) is real this phase — the rest render a
  "ships in Phase N" placeholder, matching what `docs/roadmap.md` assigns
  each tab to.
- **"Become a Seller" buyer flow** at `/account/selling`, handling all four
  states a buyer can be in: no application yet (submission form), `PENDING`
  (status + still-editable form), `REJECTED` (reason shown + resubmit form),
  and already-approved (links to `/seller/profile`). A small
  `useRefreshSession` hook re-fetches `/users/me` so approval is reflected
  immediately if the buyer has this page open when an admin approves them,
  without forcing a re-login.
- `proxy.ts` extended to gate `/seller/*` and `/admin/*` the same
  cookie-presence way `/account/*` already was.
- 19 new automated backend tests (58 total): full application lifecycle,
  duplicate-application/already-a-seller conflicts, resubmission clearing the
  rejection reason, admin-only enforcement, non-`PENDING` approve/reject
  rejection, slug-collision uniqueness, store CRUD, and suspended-seller
  lockout of `/stores/me`.

## API Endpoints Implemented

```text
POST   /api/v1/seller-applications                     (authenticated)
GET    /api/v1/seller-applications/me                  (authenticated)
PATCH  /api/v1/seller-applications/me                  (authenticated)

GET    /api/v1/admin/seller-applications               (admin)
GET    /api/v1/admin/seller-applications/:id           (admin)
POST   /api/v1/admin/seller-applications/:id/approve   (admin)
POST   /api/v1/admin/seller-applications/:id/reject    (admin)

GET    /api/v1/stores/me                               (active seller)
PATCH  /api/v1/stores/me                               (active seller)
```

## Frontend Routes Implemented

```text
/account/selling                    Become a Seller / application status+edit
/admin                              redirects to /admin/seller-applications
/admin/seller-applications          list + status filter
/admin/seller-applications/[id]     detail + approve/reject
/seller                             Dashboard tab (placeholder)
/seller/products                    placeholder
/seller/orders                      placeholder
/seller/analytics                   placeholder
/seller/reviews                     placeholder
/seller/profile                     store profile edit (real)
```

## Verification

- `npm test` (backend): **58/58 passing** (39 existing + 19 new).
- `tsc --noEmit` clean on both `backend/` and `frontend/`; `next build`
  production build succeeds; `eslint` clean on the frontend.
- Full flow manually verified against the real dev database via direct API
  calls: submit (404 before / `PENDING` after) → admin list/filter → admin
  detail → approve → `Store` created `ACTIVE` with a generated slug →
  buyer's `/auth/me` reflects the new seller capability immediately (live
  DB check, no re-login) → `GET`/`PATCH /stores/me` works and renaming the
  store leaves its slug unchanged → a non-admin gets 403 on `/admin/*`.
  `proxy.ts` gating was confirmed both ways: no session → redirected to
  `/login?from=...`; valid session → the gated page loads (200, no server
  error).
- **Gap**: the new React UI was not click-tested in a real browser —
  Playwright's Chromium download stalled in this sandbox (no outbound access
  to its CDN observed). What's actually verified is the API contract these
  components call, and that the pages compile/typecheck/render without
  server errors under a real session cookie. Form interactions, the
  approve/reject buttons, and the four conditional views on
  `/account/selling` have not been visually confirmed. Flagging this
  explicitly rather than claiming a browser test that didn't complete.

## Architectural Decisions Made This Phase

- **Store slugs are generated once, at approval, and never regenerated on
  rename.** Marketplace/store URLs (Phase 5) will depend on slug stability;
  regenerating it on every rename would silently break links.
- **`SellerApplication` and `Store` keep separate field names on purpose**
  (`storeName` vs `name`, etc.) — matches the existing Phase 1 schema.
  Approval copies fields across; the two models don't share a validation
  schema.
- **A shared `recordAuditLog(client, input)` util is the one audit-log entry
  point going forward.** It accepts either the plain Prisma client or an
  active transaction client so the audit entry commits atomically with the
  state change it documents. Every later admin action should call this
  instead of writing to `AuditLog` by hand.
- **The Admin Foundation and Seller Dashboard shells are intentionally thin
  this phase**: nav + gating + (for admin) one reusable
  list/detail/approve-reject pattern. Every later phase that needs an admin
  or seller screen adds one more entry onto these existing shells, per
  `docs/roadmap.md`, rather than building its own one-off tooling.
- **Seller application resubmission is edit-in-place, not a new row.**
  Editing a `REJECTED` application transitions it back to `PENDING` and
  clears `rejectionReason`/`reviewedById`/`reviewedAt` — there's still only
  ever one `SellerApplication` row per user (the schema's existing `@unique`
  on `userId`).

## What Should Not Be Implemented Yet

- Product creation, product moderation, marketplace/browse/search pages,
  store public pages (Phase 4/5)
- Cart, wishlist, and checkout UI
- Real payment processing
- The Products/Orders/Analytics/Reviews seller-dashboard tabs (placeholders
  only until Phases 4/8/11/10 fill them in)
- Cloudinary image upload — store/application logo and banner fields are
  currently plain URL text inputs, not file uploads
- Anything beyond what this report says is done

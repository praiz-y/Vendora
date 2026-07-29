# Phase 0 Report — Project Foundation & Development Setup

Status: **Complete**. All items below were actually run/tested in this
environment, not just assumed to work.

## Starting State

The repository was empty except for `thrill1.txt`, a free-form planning note
containing early product decisions (tech stack preference, payment
simulate-if-needed fallback, seller registration flow, admin verification
duties, product/order status lists, seller dashboard sections). These decisions
were folded into `.ai/project-context.md` rather than duplicated verbatim. The
repository was not yet a git repository.

## What Was Set Up

### Root
- `package.json` — root scripts: `dev` (runs frontend + backend together via
  `concurrently`), `dev:frontend`, `dev:backend`, `install:all`.
- `.gitignore` — excludes `node_modules/`, `.env*`, `.next/`, `dist/`,
  `coverage/`, OS/editor cruft; explicitly does **not** ignore `.env.example`
  or `.env.local.example`.
- `README.md` — project description, tech stack, repo structure, install/env/run
  instructions for frontend, backend, and database.
- `docs/README.md` — short index pointing to `.ai/` for context and phase reports.
- `.ai/project-context.md`, `.ai/reports/phase-0-report.md` (this file).

### Frontend (`frontend/`)
Scaffolded with `create-next-app` (App Router, TypeScript, Tailwind CSS,
ESLint, `src/` dir, `@/*` import alias). The nested `.git` repo that
`create-next-app` creates by default was removed since the project isn't a git
repo yet and a nested repo would behave like an accidental submodule later.

Added on top of the scaffold:
- Folders: `src/components/ui`, `src/features`, `src/lib/api`, `src/hooks`,
  `src/stores`, `src/types`, `src/config` (all empty except where noted below —
  created as placeholders per the requested structure, not filled with
  speculative code).
- `src/config/env.ts` — reads `NEXT_PUBLIC_API_URL`, warns and falls back to
  `http://localhost:4000` if unset.
- `src/lib/api/client.ts`, `types.ts`, `ApiError.ts` — a small fetch wrapper
  (`apiClient.get/post/put/patch/delete`) that sends `credentials: "include"`,
  parses the backend's `{ success, message, data }` / `{ success, message,
  error }` envelope, and throws a typed `ApiError` on failure. No
  auth/refresh-retry logic yet (correctly out of scope for Phase 0).
- `src/components/providers/QueryProvider.tsx` — wraps the app in a
  `QueryClientProvider` (TanStack Query), wired into `src/app/layout.tsx`.
- `middleware.ts` — no-op passthrough placeholder; documented as where
  auth-based route protection will go later.
- `src/hooks/useHealthCheck.ts` + `src/app/dev/health/page.tsx` — a
  development-only page (not linked from any nav) that calls
  `GET /api/v1/health` through the real API client, to prove the
  browser → Next.js → Express path works. Kept intentionally, per the phase
  instructions allowing a small dev-only verification page.
- `next.config.ts` — pinned `turbopack.root` to the frontend dir to silence a
  workspace-root warning caused by the root-level `package-lock.json`.
- `.env.local` (real, gitignored) and `.env.local.example` (committed) with
  `NEXT_PUBLIC_API_URL`.

Installed on top of the scaffold's own deps: `@tanstack/react-query`,
`zustand`, `zod` (frontend stack items from the spec that weren't part of the
`create-next-app` template).

### Backend (`backend/`)
Hand-built (no scaffolding CLI) since Express has no equivalent official
generator that matches this structure.

- `src/config/env.ts` — centralizes all env vars (port, database URL, frontend
  URL, JWT/Cloudinary/payment placeholders) with a `required()` helper.
- `src/utils/apiResponse.ts` — `sendSuccess()` / `sendError()` implementing the
  agreed response envelope.
- `src/utils/ApiError.ts` — typed error class with static helpers
  (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `internal`).
- `src/middlewares/errorHandler.ts` — `notFoundHandler` (404 → `ApiError`) and
  `errorHandler` (final centralized error middleware; know about `ApiError`,
  falls back to a generic 500 for anything else).
- `src/middlewares/requestLogger.ts` — `morgan`, `dev` format in development,
  `combined` in production.
- `src/modules/health/` — `health.controller.ts` + `health.routes.ts`
  implementing `GET /api/v1/health`.
- `src/routes/v1/index.ts` — mounts module routers under one versioned router.
- `src/app.ts` — configures Express (`helmet`, `cors` scoped to `FRONTEND_URL`
  with `credentials: true`, JSON/urlencoded body parsing, request logger,
  `/api/v1` routes, 404 handler, error handler). Exports `createApp()`, no
  side effects.
- `src/server.ts` — imports `createApp()` and calls `.listen()`. Kept separate
  from `app.ts` per the requested `server.ts → app.ts` split.
- `prisma/schema.prisma` — minimal schema (single `HealthCheck` model) with a
  PostgreSQL datasource read from `DATABASE_URL`, explicitly scoped as a
  Phase-0-only connectivity check, not the domain schema.
- `.env` (real, gitignored) and `.env.example` (committed).
- Relative imports throughout (no `@/*` alias) — decided against wiring
  `tsx`/tsconfig-paths resolution for a thin Express app; see
  `project-context.md` for the reasoning.

### Database
- No local PostgreSQL install was found (`psql` not on PATH, no
  `Program Files\PostgreSQL`). Docker Desktop was already installed but not
  running; it was started for this session.
- Two unrelated Postgres containers from other local projects were already
  running on ports 5432 and 5433, so a **new, dedicated** container
  `vendora-postgres` (image `postgres:17`) was created on host port **5434**
  to avoid any cross-project collision. `DATABASE_URL` in `backend/.env`
  points at it.

## Dependencies Installed

**Backend**: `@prisma/client`, `cors`, `dotenv`, `express`, `helmet`, `morgan`,
`zod` (v4) — plus dev deps `@types/cors`, `@types/express`, `@types/morgan`,
`@types/node`, `prisma`, `tsx`, `typescript`.

**Frontend**: `create-next-app`'s own deps (`next`, `react`, `react-dom`,
Tailwind v4, ESLint) plus `@tanstack/react-query`, `zustand`, `zod` (v4).

**Root**: `concurrently` (dev dependency, powers `npm run dev`).

## Configuration Completed

- `FRONTEND_URL` / `NEXT_PUBLIC_API_URL` env-driven, no hardcoded origins in
  application code.
- CORS restricted to `FRONTEND_URL` with credentials enabled (needed later for
  the HttpOnly refresh-token cookie).
- API versioned under `/api/v1`; consistent success/error envelope implemented
  once and reused via `sendSuccess`/`sendError`/`ApiError`.

## Database Connection Status

**Verified working end-to-end**, not just configured:
- `npx prisma generate` succeeded.
- `npx prisma migrate dev --name init_health_check` succeeded and created
  `prisma/migrations/20260728083622_init_health_check/migration.sql` against
  the live `vendora-postgres` container.
- A throwaway script instantiated `PrismaClient`, inserted a `HealthCheck` row,
  and read it back (`count() === 1`) before the script was deleted.

## Commands Used To Run The Project

```bash
# one-time
docker run --name vendora-postgres -e POSTGRES_USER=vendora \
  -e POSTGRES_PASSWORD=vendora_dev_password -e POSTGRES_DB=vendora \
  -p 5434:5432 -d postgres:17

cd backend && npx prisma generate && npx prisma migrate dev

# every time (from repo root)
npm run dev            # both apps together
npm run dev:frontend    # Next.js only, http://localhost:3000
npm run dev:backend     # Express only, http://localhost:4000
```

## What Was Tested Successfully

- Backend: `npx tsc --noEmit` (clean), `npm run build` (tsc → `dist/`, clean),
  `GET /api/v1/health` via `curl` → exact expected envelope
  (`{"success":true,"message":"Vendora API is running","data":{"status":"ok"}}`),
  `GET /api/v1/does-not-exist` → 404 through the centralized error handler with
  the error envelope, CORS preflight/response headers present and scoped to
  `http://localhost:3000` when that Origin is sent.
- Frontend: `npx tsc --noEmit` (clean), `npm run lint` (clean, after removing
  an unused middleware param), `npm run build` (production build succeeds, 3
  static routes generated including `/dev/health`), dev server serves `/` and
  `/dev/health` with HTTP 200.
- Database: see "Database Connection Status" above — this was actually
  exercised with a real insert/read, not just a successful `generate`.
- Integration: confirmed via `curl` that a request with
  `Origin: http://localhost:3000` reaches the Express backend and gets the
  correct `Access-Control-Allow-Origin`/`Access-Control-Allow-Credentials`
  headers back, and that the frontend's `/dev/health` page (which calls the
  real API client against `NEXT_PUBLIC_API_URL`) renders successfully. Full
  visual browser confirmation of the client-side fetch resolving was not done
  in this environment (no browser available here) — the CORS + endpoint
  behavior plus code review of `useHealthCheck`/`apiClient` stand in for it.

## Issues Encountered (and how they were resolved)

1. **Port 5000 already in use** by an unrelated process on this machine —
   `EADDRINUSE` on first backend start. Resolved by moving the backend to
   **port 4000** everywhere (`.env`, `.env.example`, frontend env, README).
2. **`create-next-app` initializes its own git repo** by default, but the
   overall Vendora repo wasn't a git repo yet. Resolved by deleting
   `frontend/.git` immediately after scaffolding to avoid a future nested-repo
   surprise.
3. **`frontend/.gitignore`'s `.env*` pattern would have silently excluded
   `.env.local.example`** from version control (violating the "commit
   `.env*.example` files" requirement). Fixed by adding explicit
   `!.env.local.example` / `!.env.example` negations.
4. **npm install transient failure** on the first backend install attempt
   (`EBUSY`/`ECONNRESET` while fetching Prisma engines) — a network/antivirus
   hiccup, not a config issue. Resolved by simply re-running `npm install`.
5. **Turbopack workspace-root warning** because of both a root-level and a
   frontend-level `package-lock.json`. Resolved by pinning `turbopack.root` in
   `next.config.ts`.
6. **zod version drift** — frontend picked up zod v4 (current), backend's
   `package.json` was initially pinned to v3. Aligned both on `^4.4.3` and
   reinstalled, since both apps will eventually share the same validation
   patterns and there's no reason to fragment versions this early.
7. Two unrelated Postgres Docker containers were already running locally on
   5432/5433 from other projects — not an error, but worth flagging: Vendora
   deliberately got its own container/port rather than reusing either.

## Decisions Made

- Backend runs on port **4000** (not 5000) for local dev, driven entirely by
  env vars so it's a one-line change if this machine's port conflict doesn't
  apply elsewhere.
- Local Postgres for development is a disposable Docker container, not a
  native install — documented in the README so it's reproducible.
- `zod` pinned to v4 in both apps.
- No npm workspaces — the root `package.json` only orchestrates dev scripts.

## Anything Intentionally Deferred

Everything the phase spec explicitly disallowed for Phase 0: the full database
schema (Users/Products/Orders/Payments/etc.), authentication implementation,
seller registration, products, cart, checkout, payment processing, admin
dashboard, seller dashboard. Also deferred: upgrading Prisma from 6.19.3 to the
newly-available 7.x major (flagged by the CLI) — left on the tested 6.x line to
avoid destabilizing a just-verified connection; worth revisiting deliberately,
not as a side effect of Phase 1.

## Decisions For The User Before/During Phase 1

- Confirm port **4000** for the backend is acceptable long-term (vs. picking a
  different fixed port), since 5000 was taken by something unrelated on this
  machine and may or may not be taken on other machines/deployments.
- Confirm the **Prisma 6 → 7 major upgrade** is out of scope for now (can be
  picked up as its own small task whenever convenient).

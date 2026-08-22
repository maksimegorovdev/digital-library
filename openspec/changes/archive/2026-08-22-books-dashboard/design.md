## Context

The `/books` screen currently server-renders a card grid: a Next.js
server component (`frontend/src/app/books/page.tsx`) fetches the first
page via `fetchBooks` (`frontend/src/lib/api.ts`), hands it to a
client component (`components/books-browser.tsx`) that owns
`useState` for the accumulated list and exposes a "Show more" button.
The backend (`backend/internal/httpapi/books.go`,
`backend/internal/store/books.go`) exposes `GET /books?limit&offset`
against a Postgres `books` table (`id`, `title`, `author`, `year`,
`genre`, `cover_url`, `created_at`), with no filtering support. Only
`button`, `card`, and `dropdown-menu` are installed from shadcn/ui.
Postgres is currently started with a manual `docker run` command
documented in the README; there is no `docker-compose.yml`. Backend
config (`backend/internal/config`) reads plain OS env vars with no
`.env` loading. The `book-catalog` capability
(`openspec/specs/book-catalog/spec.md`) documents the current
"Book List Page" (SSR grid) and "Load More Pagination" requirements
that this change supersedes.

The user wants this treated as a home-library registry dashboard:
a shadcn data table, client-side (API-call) fetching instead of SSR,
groundwork for server-side filters and for add/delete/edit — without
implementing the real filtering or CRUD backend yet — and Postgres
brought up via docker-compose.

## Goals / Non-Goals

**Goals:**
- Replace the SSR card grid with a shadcn data table (TanStack Table)
  driven entirely by client-side `fetch` calls to the existing
  `GET /books` endpoint.
- Page-based pagination (page number + page size) replacing "load
  more", without changing the `GET /books` `limit`/`offset` contract.
- A toolbar scaffold for server-side filtering (search + genre) that
  is fully interactive and URL-synced, but does not yet affect the
  fetch — establishing the shape a follow-up change will wire up.
- UI affordances for add/edit/delete (toolbar button + row actions)
  backed by a `Drawer` + form, wired to typed client-side API stub
  functions that report "not implemented" — establishing the pattern
  a follow-up change will back with real endpoints.
- Postgres started via a root `docker-compose.yml`.
- Working `backend/.env` and `frontend/.env.local` created now (local
  dev convenience, not committed), with their `.example` templates
  kept in sync and committed.
- All new user-facing UI text in Russian, consistent with existing
  strings.

**Non-Goals:**
- Implementing real server-side filtering (backend query params,
  actual result narrowing).
- Implementing real create/update/delete endpoints or wiring the
  drawer forms to them.
- Introducing a request/cache layer such as `@tanstack/react-query`
  (no real mutations exist yet to justify it).
- Changing the `GET /books` request/response contract.

## Decisions

- **Keep the `limit`/`offset` contract on `GET /books` unchanged.**
  The data table's page-based pagination state (`page`, `pageSize`) is
  translated client-side to `offset = (page - 1) * pageSize`. This
  avoids any backend change for pagination and keeps the change
  additive on the frontend. Alternative considered: switch the API to
  `page`/`pageSize` params — rejected as unnecessary churn on a
  contract that already works.
- **Filters are live in the UI (state + URL sync) but inert on the
  fetch.** Chosen over (a) fully disabled/no-op controls and (b)
  client-side-only filtering of the loaded page. (a) would not
  establish the actual state-management plumbing a follow-up change
  needs; (b) risks a visible behavior regression once server-side
  filtering lands and results change from "filters the current page"
  to "filters the whole library" — confusing for a returning user.
- **CRUD affordances use a full `Drawer` + validated form
  (`react-hook-form` + `zod`), with submit calling a typed stub that
  returns "not implemented," surfaced via a `sonner` toast.** Chosen
  over disabling the buttons entirely, so the follow-up change is a
  pure swap of the stub for a real API call rather than a UI build-out.
- **No `@tanstack/react-query` in this change.** The page has exactly
  one query and zero real mutations today; adopting a cache/mutation
  library ahead of real need is premature abstraction. Revisit when
  the follow-up change adds real mutations that need cache
  invalidation.
- **`godotenv.Load()` added to `cmd/server/main.go`** to make
  `backend/.env` actually take effect locally. It no-ops silently when
  the file is absent, so production/CI (env vars injected directly)
  is unaffected, and it does not override variables already set in the
  OS environment.
- **New root `docker-compose.yml` with a single `postgres:18` service**
  matching the existing README/`config.Load` defaults
  (`POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`,
  `POSTGRES_DB=digital_library`), a named volume, and a `pg_isready`
  healthcheck. The README's manual `docker run` instructions are
  replaced with `docker compose up -d`.
- **Real `backend/.env` / `frontend/.env.local` are created now**
  (already covered by the existing `.env*` gitignore rule) and their
  `.example` counterparts (`backend/.env.example` — new;
  `frontend/.env.local.example` — updated if needed) are kept
  committed, extending the existing gitignore exception pattern to
  `backend/.env.example`.

## Risks / Trade-offs

- **New dependency surface in one change** (`@tanstack/react-table`,
  `react-hook-form`, `@hookform/resolvers`, `zod`, `vaul`, `sonner`) →
  Mitigation: all are the standard shadcn/ui-recommended pairings for
  `data-table`, `form`, `drawer`, and `sonner` registry items, so the
  code that lands matches documented, widely-used patterns rather than
  a bespoke solution.
- **Inert filters could read as broken to a user unfamiliar with the
  roadmap** → Mitigation: this is a personal single-user home-library
  tool, and the follow-up change wiring real filtering is expected
  immediately after; acceptable short-term trade-off given the user's
  explicit request to scaffold-only.
- **CRUD drawer submissions always report "not implemented"** →
  Mitigation: the toast copy will state this plainly in Russian so it
  reads as a known placeholder, not a bug.

## Open Questions

None blocking. Real server-side filtering and real CRUD endpoints are
deliberately deferred to a follow-up change; this design is shaped so
that change is additive (wire filter params into the fetch, replace
the stub API functions with real calls) rather than a further
restructuring of the table/drawer.

## Why

The `/books` screen is currently a server-rendered card grid with a
"load more" button — fine for a simple browse view, but the user wants
`/books` to work as a home-library registry dashboard: a proper data
table, client-side data fetching, and the groundwork for server-side
filtering and for adding/editing/deleting books. Postgres is also
currently started with an ad hoc `docker run` command with no
reproducible compose file. Addressing all four now, together, lets the
data table, filter state, and management UI land as one coherent
foundation instead of being bolted on piecemeal later.

## What Changes

**Book list rendering**
- From: `/books` is a server component that fetches the first page via
  SSR and hands it to a client component rendering a card grid with a
  "load more" button.
- To: `/books` is a client component that fetches books entirely via
  browser `fetch` calls and renders them in a shadcn/TanStack data
  table with page-based pagination (page number + page size selector).
- Reason: matches the requested dashboard/registry presentation and
  API-driven fetching; page-based pagination is the standard pattern
  for the shadcn data table.
- Impact: non-breaking for the backend (the `GET /books`
  `limit`/`offset` contract is unchanged); `books-browser.tsx` and
  `book-card.tsx` (and their tests) are removed and replaced.

**Filtering**
- From: no filtering exists anywhere in the book list.
- To: the data table's toolbar has live search and genre controls
  whose state is kept in React and synced to the URL, but does not yet
  affect the `GET /books` request.
- Reason: lays the groundwork for server-side filtering (the intended
  future model) without building throwaway client-side filtering logic
  that would behave differently once the server-side version lands.
- Impact: non-breaking; a follow-up change is expected to wire this
  state into the fetch and add matching backend query-param support.

**Book management (add / edit / delete)**
- From: no book management UI or API exists.
- To: a toolbar "Add" button and per-row actions ("Edit" / "Delete")
  open a `Drawer` with a validated form; submitting calls typed
  client-side API stub functions (`createBook`, `updateBook`,
  `deleteBook`) that report "not implemented," surfaced via a toast.
- Reason: establishes the UI pattern and API contract shape a
  follow-up change will back with real backend endpoints, without
  scope-creeping this change into full CRUD.
- Impact: non-breaking; no backend write endpoints are added in this
  change.

**Local Postgres startup**
- From: developers run a manual `docker run ...` command documented in
  the README.
- To: a root `docker-compose.yml` defines a `postgres:18` service
  matching the existing connection defaults; the README instructs
  `docker compose up -d`.
- Reason: requested explicitly; also more reproducible than a manual
  `docker run` invocation.
- Impact: non-breaking; existing manually-started Postgres containers
  keep working, this only changes the documented/recommended path.

**Local environment files**
- From: only `frontend/.env.local.example` exists; the backend reads
  configuration purely from the OS environment with no `.env` support.
- To: `backend/.env` and `frontend/.env.local` are created with working
  local values (gitignored, not committed); `backend/.env.example` is
  added and `frontend/.env.local.example` is kept in sync; the backend
  loads `backend/.env` at startup (no-op if absent, does not override
  variables already set in the OS environment).
- Reason: requested explicitly, and removes a manual "export these env
  vars yourself" step from local setup.
- Impact: non-breaking; production/CI environments that set env vars
  directly are unaffected.

## Capabilities

### New Capabilities

(none — all changes extend existing capabilities)

### Modified Capabilities

- `book-catalog`: replaces the "Book List Page" and "Load More
  Pagination" requirements with a client-fetched data-table dashboard
  page using page-based pagination; adds requirements for the
  filter-toolbar scaffold and the add/edit/delete UI scaffold.
- `monorepo-tooling`: adds a requirement that local Postgres is started
  via `docker-compose.yml`, and that both services load local
  configuration from `.env`/`.env.local` files with committed
  `.example` templates.

## Impact

- **Backend**: `cmd/server/main.go` gains a `godotenv.Load()` call
  (new dependency); no HTTP contract changes. New `backend/.env` (not
  committed) and `backend/.env.example` (committed).
- **Frontend**: new dependencies for the data table
  (`@tanstack/react-table`), management drawer/form
  (`react-hook-form`, `@hookform/resolvers`, `zod`, `vaul` via the
  shadcn `drawer` component), and toasts (`sonner`, already have
  `next-themes` as its peer). New `frontend/src/components/books/`
  directory (`columns.tsx`, `data-table.tsx`, `toolbar.tsx`,
  `book-form-drawer.tsx`, `delete-book-drawer.tsx`); `lib/api.ts`
  gains a `BooksQuery` type and CRUD stub functions.
  `books-browser.tsx`, `book-card.tsx`, and their tests are deleted.
  New `frontend/.env.local` (not committed); `.env.local.example`
  reviewed/updated.
  New shadcn/ui components installed: `table`, `dialog`/`drawer`,
  `form`, `input`, `select`, `label`, `sonner`.
- **Infra**: new root `docker-compose.yml`; `README.md` updated to
  reference `docker compose up -d`.
- **Docs/specs**: `openspec/specs/book-catalog/spec.md` and
  `openspec/specs/monorepo-tooling/spec.md` receive delta updates via
  this change's `specs/` deltas.

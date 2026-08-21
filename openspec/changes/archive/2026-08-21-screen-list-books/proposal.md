## Why

The user has a home library of 1000+ physical books with no digital way to browse them. The project currently has no book domain at all — no storage, no API, no page. This change delivers the first end-to-end slice: a persisted book catalog and a page to browse it, so the library becomes visible before any editing workflow (adding/removing books) is built on top of it.

## What Changes

**New: book storage and read API**
- From: no `books` table, no book-related endpoint exists.
- To: a Postgres `books` table (`title`, `author`, `year?`, `genre?`, `cover_url?`) and `GET /books?limit=&offset=` returning a paginated, stably-ordered (`author, title, id`) list.
- Reason: the list page needs a data source; the library is too large (1000+ books) to hold or transfer unpaginated.
- Impact: non-breaking (net-new route and table). Requires `DATABASE_URL` config and a DB connection at backend startup.

**New: `/books` page**
- From: no book-related frontend route.
- To: an SSR card-grid page rendering the first page of books, with a client-side "Load more" control for subsequent pages. Missing optional fields (year, genre, cover) render gracefully; empty library and backend-error states are both handled without throwing, following the existing `fetchHealth`/`HealthStatus` pattern.
- Reason: gives the user a way to actually browse their library.
- Impact: non-breaking (net-new route).

**Explicitly out of scope for this change:** adding/editing/deleting books (tracked separately as a future `add-book-form` change — books are seeded via a migration for now), search, sort, filter, and any list grouping (e.g. alphabetical headers).

## Capabilities

### New Capabilities
- `book-catalog`: storing books (Postgres schema + migrations + seed data) and serving them as a paginated, stably-ordered list via `GET /books`, rendered as a browsable card-grid page at `/books`.

### Modified Capabilities
(none — no existing capability's requirements change)

## Impact

- **Backend**: new `internal/store` package (DB access), new `internal/httpapi/books.go` handler, `internal/config` gains `DatabaseURL`, `cmd/server/main.go` opens a DB pool at startup (fails fast if unreachable), new `backend/migrations/` directory (`golang-migrate`), new dependency `jackc/pgx/v5`.
- **Frontend**: new `frontend/src/app/books/page.tsx`, new `fetchBooks()` in `frontend/src/lib/api.ts`, new card-grid + "Load more" components under `frontend/src/components/`.
- **Infra/dev workflow**: local Postgres is now a runtime dependency (README/Makefile need a note on running migrations); no change to CI/CD in this change.

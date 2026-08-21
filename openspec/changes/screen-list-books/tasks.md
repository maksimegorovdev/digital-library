## 1. Database & Migrations

- [ ] 1.1 Add `golang-migrate` CLI usage to the project (document install; no new Go dependency needed if run as a standalone CLI)
- [ ] 1.2 Create `backend/migrations/0001_create_books.up.sql` / `.down.sql` defining the `books` table (`id`, `title`, `author`, `year`, `genre`, `cover_url`, `created_at`) per design.md
- [ ] 1.3 Create `backend/migrations/0002_seed_books.up.sql` / `.down.sql` with ~8 sample books, including some missing `year`/`genre`/`cover_url`
- [ ] 1.4 Add `DatabaseURL` to `backend/internal/config`, with a local-dev default, following the existing `envOrDefault` pattern

## 2. Backend: store & API

- [ ] 2.1 Add `jackc/pgx/v5` (stdlib driver) to `backend/go.mod`
- [ ] 2.2 Implement `internal/store/books.go`: `Book` struct (nullable `*int` year, `*string` genre/cover_url), `Store` wrapping `*sql.DB`, `ListBooks(ctx, limit, offset) (books []Book, total int, err error)` ordered by `author, title, id`
- [ ] 2.3 Open the DB pool in `cmd/server/main.go` (`sql.Open` + `PingContext`, `SetMaxOpenConns`/`SetMaxIdleConns`/`SetConnMaxLifetime`/`SetConnMaxIdleTime`), fail fast (`log.Fatal`-equivalent) if unreachable
- [ ] 2.4 Implement `GET /books` handler in `internal/httpapi/books.go` (parse/validate `limit`/`offset`, call `store.ListBooks`, return `{books, total, limit, offset}` as camelCase JSON); wire the store into `NewRouter`
- [ ] 2.5 Unit/integration tests for `internal/store.ListBooks` (ordering, pagination boundaries, nullable fields) against a test database
- [ ] 2.6 Unit tests for the `GET /books` handler (success, empty result, invalid params, store error → 500) using a fake/mock store

## 3. Frontend: fetch & page

- [ ] 3.1 Add `fetchBooks(offset, limit)` to `frontend/src/lib/api.ts`, mirroring `fetchHealth()`'s discriminated-union/no-throw pattern
- [ ] 3.2 Build a book card component: cover (`next/image`, fixed aspect ratio, placeholder when `coverUrl` is absent), title, author, and optional year/genre rendered only when present
- [ ] 3.3 Build `frontend/src/app/books/page.tsx` as an async Server Component rendering the first page as a responsive card grid
- [ ] 3.4 Build a client "Load more" component that fetches subsequent pages via `fetchBooks`, appends results to the grid, and hides itself once all books are loaded
- [ ] 3.5 Handle the empty-library state (message, no CTA) and the backend-error state (error message instead of grid) on the page
- [ ] 3.6 Unit tests for `fetchBooks()` (success, empty list, network error, non-200 status)
- [ ] 3.7 Component tests for the books page (renders cards, empty state, error state) and the "Load more" control (fetches next page, hides at the end)

## 4. Docs & wiring

- [ ] 4.1 Update the root `README.md` with the `DATABASE_URL` config var and migration run instructions
- [ ] 4.2 Add a `make migrate-up` / `make migrate-down` target (or equivalent) to `Makefile` for running `golang-migrate` locally

## Context

`digital-library` is a monorepo with a Go backend (`chi` router, no framework wrapping, no database yet — only `/healthz`) and a Next.js frontend (App Router, shadcn/ui, `next-themes`). The home page already establishes the fetch pattern: an async Server Component calls a `lib/api.ts` helper that normalizes network/HTTP failures into a discriminated union instead of throwing (`fetchHealth` → `HealthStatus`).

This change adds the home library's book list: a new `books` table in Postgres, a `GET /books` endpoint, and a `/books` page. There is no book domain in the codebase yet, so this introduces the first persistence layer and the first paginated list in the project.

The library holds 1000+ books, which rules out returning the full set in one response and rendering it all client-side.

## Goals / Non-Goals

**Goals:**
- Display the user's home library as a browsable, paginated card grid.
- Establish the `books` table and a minimal read-only API (`GET /books`) that a future add/edit change can build on.
- Follow the codebase's existing minimalism: no ORM, no query builder, no UI framework beyond what's already installed.

**Non-Goals:**
- Adding, editing, or deleting books (tracked as a future change, `add-book-form`). Books are seeded via a migration for now.
- Search, sort, or filter UI. Only a fixed `ORDER BY author, title, id`.
- Alphabetical section headers or any other list grouping.
- URL-addressable pagination (page numbers, query-string state). "Load more" is enough for a feed-like browsing experience.

## Decisions

### Backend: `database/sql` + `pgx/v5`, no ORM
A `internal/store` package wraps a `*sql.DB` (opened with the `pgx/v5` stdlib driver) with one method, `ListBooks(ctx, limit, offset) ([]Book, total int, error)`. Rows are scanned into `Book` by hand; nullable columns (`year`, `genre`, `cover_url`) use pointer fields.

Alternatives considered:
- **sqlx + goose**: `sqlx.StructScan` removes manual scanning, and goose migrations embed into the binary via `go:embed`. Rejected — adds a dependency to save boilerplate on a single query, and this project currently has zero abstractions on top of the standard library (`chi`, `net/http`, `database/sql` are all used directly).
- **GORM**: rejected outright — an ORM's implicit query generation and hooks conflict with the project's explicit, no-magic style.

Chosen because it matches `healthz.go`/`router.go`'s existing style exactly and keeps the dependency surface minimal for a single read query.

### Migrations: `golang-migrate`
Plain SQL files in `backend/migrations/`: `0001_create_books.{up,down}.sql` creates the table, `0002_seed_books.{up,down}.sql` inserts ~8 sample rows (including some with missing `year`/`genre`/`cover_url`, to exercise the UI's handling of absent fields). `golang-migrate` is a widely-used, dependency-light tool that doesn't couple migrations to application code, and gives the user a normal SQL file to review before it's applied — schema changes are not something this design decides unilaterally.

### Pagination: offset-based, "load more"
`GET /books?limit=50&offset=0` returns `{books, total, limit, offset}`. Sort order is `ORDER BY author, title, id` — the `id` tiebreaker keeps ordering stable across requests even for rows with identical author/title. The frontend renders the first page via SSR (fast first paint, no loading spinner) and a small client-side "Load more" component fetches subsequent pages and appends them.

Cursor-based pagination was considered and rejected: this is a single-user personal library with no concurrent-write pressure, so the extra complexity isn't justified.

### Frontend: card grid, not shadcn `data-table`
The book list renders as a responsive card grid (shadcn `Card`, `next/image` with a fixed aspect ratio and a placeholder for missing covers) rather than shadcn's `data-table` block.

This was raised mid-brainstorm; checking the current `data-table-demo` example in the shadcn registry confirmed it's a `@tanstack/react-table` wrapper whose entire value proposition — sorting, filtering, pagination, column visibility, row selection — is explicitly out of scope for this change. Adopting it now would mean a new dependency, a forced `"use client"` component (breaking the SSR-first pattern used elsewhere), and a cover image demoted to a small table-cell thumbnail instead of a recognizable book cover. Revisit `data-table` if/when real column sorting or filtering is added.

### Fetch pattern: extend `lib/api.ts`
`fetchBooks(offset, limit)` follows `fetchHealth()`'s shape: a discriminated union (`{ok: true, books, total} | {ok: false, error}`), 5s timeout via `AbortSignal.timeout`, no thrown errors. The `/books` page stays a plain async Server Component for the first page; only the "Load more" affordance needs client-side state.

## Risks / Trade-offs

- **[Risk]** Offset pagination can skip or repeat rows if books are inserted/deleted between page loads. → **Mitigation**: acceptable for now — there's no write path yet (no add/edit UI), so the underlying data is static during a browsing session.
- **[Risk]** Rendering covers as `next/image` without knowing real dimensions ahead of time could cause layout shift. → **Mitigation**: fixed aspect-ratio container reserves space regardless of the actual image size.
- **[Risk]** A future change that reworks pagination into cursor-based (should the library grow further or need stronger consistency) will need to change the `GET /books` contract. → **Mitigation**: the response shape (`{books, total, limit, offset}`) is intentionally minimal so it's cheap to extend or replace.

## Migration Plan

1. Add `DATABASE_URL` to backend config with a local-dev default; document it in the README alongside the existing `PORT`/`FRONTEND_ORIGIN` vars.
2. Add and run `0001_create_books` and `0002_seed_books` migrations locally.
3. Ship `internal/store`, the `GET /books` handler, and wire the DB pool into `main.go` (fail fast on connection failure).
4. Ship `lib/api.ts#fetchBooks` and the `/books` page + "Load more" component.
5. No rollback concerns beyond the migrations' own `.down.sql` files — this change adds a new, previously-nonexistent table and route; nothing existing is modified.

## Open Questions

None — every open decision was resolved with the user during brainstorming (storage engine, scope, fields, seeding, pagination, and the card-grid-vs-data-table choice).

## 1. Local Postgres via docker-compose

- [ ] 1.1 Add root `docker-compose.yml` with a `postgres:18` service (`POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=digital_library`), port `5432:5432`, a named volume for data persistence, and a `pg_isready` healthcheck.
- [ ] 1.2 Update `README.md`'s Database section to use `docker compose up -d` instead of the manual `docker run` command.

## 2. Local environment files

- [ ] 2.1 Add `godotenv` to `backend/go.mod` and call `godotenv.Load()` at the top of `run()` in `backend/cmd/server/main.go`, ignoring a missing-file error so prod/CI (env vars set directly) is unaffected.
- [ ] 2.2 Create `backend/.env.example` documenting `PORT`, `FRONTEND_ORIGIN`, `DATABASE_URL`, and `TEST_DATABASE_URL` with the same defaults as `backend/internal/config`.
- [ ] 2.3 Create `backend/.env` (gitignored) from the example, with working local values matching the new `docker-compose.yml`.
- [ ] 2.4 Add a `!backend/.env.example` exception to the root `.gitignore`, next to the existing `!.env.local.example` exception, so the new example file is tracked.
- [ ] 2.5 Review `frontend/.env.local.example` for accuracy (still just `NEXT_PUBLIC_API_URL`) and create `frontend/.env.local` (gitignored) from it.

## 3. Frontend dependencies and shadcn components

- [ ] 3.1 Install `@tanstack/react-table`.
- [ ] 3.2 Add shadcn components: `table`, `drawer`, `form`, `input`, `select`, `label`, `sonner` (pulls in `vaul`, `react-hook-form`, `@hookform/resolvers`, `zod` as transitive deps).
- [ ] 3.3 Mount the `sonner` `<Toaster />` in `frontend/src/app/layout.tsx`.

## 4. Data table core

- [ ] 4.1 Extend `frontend/src/lib/api.ts` (or split into `frontend/src/lib/api/books.ts`) with a `BooksQuery` type (`page`, `pageSize`, optional `search`, optional `genre`) and update `fetchBooks` to accept it, translating `page`/`pageSize` to `offset`/`limit` for the existing `GET /books` call — the query string sent to the backend still only carries `limit`/`offset`.
- [ ] 4.2 Add `frontend/src/components/books/columns.tsx` defining TanStack `ColumnDef<Book>[]` for Title, Author, Year, Genre, cover thumbnail (with placeholder for missing `coverUrl`), and an actions column (Edit/Delete dropdown).
- [ ] 4.3 Add `frontend/src/components/books/data-table.tsx` implementing the shadcn/TanStack data-table pattern with page-based pagination (page number control + page size selector) driven by `useReactTable`'s manual pagination mode against `BooksQuery`.
- [ ] 4.4 Add `frontend/src/components/books/books-dashboard.tsx` ('use client') that owns fetch/loading/error state, calls the updated `fetchBooks`, and renders the toolbar + data table; handle empty-library and request-failure states per the `book-catalog` spec deltas.
- [ ] 4.5 Rewrite `frontend/src/app/books/page.tsx` to render `<BooksDashboard />` directly with no server-side fetch.
- [ ] 4.6 Delete `frontend/src/components/books-browser.tsx`, `frontend/src/components/books-browser.test.tsx`, `frontend/src/components/book-card.tsx`, and `frontend/src/components/book-card.test.tsx`.

## 5. Filter toolbar scaffold

- [ ] 5.1 Add `frontend/src/components/books/toolbar.tsx` with a search `Input` and a genre `Select`, holding their values in local state synced to the URL via `useSearchParams`/`useRouter` (Next.js App Router), with Russian labels/placeholders.
- [ ] 5.2 Wire the toolbar into `books-dashboard.tsx` above the table; confirm (via a component test) that changing a filter control updates the URL but does not change the `fetchBooks` call arguments.

## 6. Book management scaffold (add / edit / delete)

- [ ] 6.1 Add `createBook`, `updateBook`, `deleteBook` stub functions to the frontend API layer, typed to accept book field(s)/id and resolve to a `{ ok: false, error: 'not_implemented' }`-shaped result.
- [ ] 6.2 Add `frontend/src/components/books/book-form-drawer.tsx`: a shadcn `Drawer` with a `react-hook-form` + `zod`-validated form (title/author required; year, genre, cover URL optional), reused for both "Add" and "Edit" (pre-filled) via props; on submit, calls the relevant stub and shows a `sonner` toast ("Функция скоро появится" or similar Russian copy) without mutating the displayed table rows.
- [ ] 6.3 Add `frontend/src/components/books/delete-book-drawer.tsx`: a confirmation `Drawer` that calls the `deleteBook` stub and shows the same "not implemented" toast pattern.
- [ ] 6.4 Wire an "Добавить книгу" toolbar button (opens the add drawer) and row "Edit"/"Delete" actions (from the actions column in `columns.tsx`) into `books-dashboard.tsx`.

## 7. Tests

- [ ] 7.1 Add/update frontend component tests for `books-dashboard.tsx` covering: first-page render, empty state, fetch-error state, and page/page-size navigation.
- [ ] 7.2 Add frontend component tests for the filter toolbar (state updates, URL sync, no effect on fetch args) and the management drawers (validation blocks submit; valid submit calls the stub and shows the toast without changing table data).
- [ ] 7.3 Add a Go test for `godotenv.Load()` wiring in `backend/cmd/server` (or config loading) confirming a present `.env` populates config and a missing one falls back to existing defaults/OS env behavior.
- [ ] 7.4 Update the `/books` Playwright e2e test (`frontend/e2e`) for the new data-table markup (rows/pagination controls) instead of the card grid and "Show more" button.

## 8. Docs

- [ ] 8.1 Update `README.md`'s Configuration section to mention `backend/.env`/`frontend/.env.local` alongside the existing env var documentation, and the `docker-compose.yml` addition.

# Books Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the server-rendered `/books` card grid with a client-fetched shadcn data-table dashboard, add scaffolding for server-side filters and for add/edit/delete, and start local Postgres via docker-compose.

**Architecture:** `/books` becomes a client component tree (`BooksDashboard` → `BooksToolbar` + `BooksDataTable` + two `Drawer`-based forms) that fetches `GET /books` from the browser via an updated `fetchBooks(query)`; the backend HTTP contract is untouched. Filter state lives in the toolbar and syncs to the URL but never reaches the fetch. Add/edit/delete drawers call typed stub API functions that report "not implemented" via a toast. Postgres and both services' local env files are provisioned once, up front.

**Tech Stack:** Next.js App Router (client components), `@tanstack/react-table`, shadcn/ui (`table`, `drawer`, `form`, `input`, `select`, `sonner`), `react-hook-form` + `zod`, Go/chi backend (unchanged contract), `godotenv`, Docker Compose, Postgres 18.

**Spec:** `openspec/changes/books-dashboard/design.md`, `openspec/changes/books-dashboard/specs/book-catalog/spec.md`, `openspec/changes/books-dashboard/specs/monorepo-tooling/spec.md`

## Global Constraints

- `GET /books` keeps its existing `limit`/`offset` query contract — never add `page`/`search`/`genre` params to the backend in this plan.
- All new user-facing UI text is in Russian.
- Filter values (`search`, `genre`) are held in UI state and the URL only — they must never appear in the `fetchBooks` request query string in this plan.
- `createBook`/`updateBook`/`deleteBook` always resolve `{ ok: false, error: 'not_implemented' }` and never perform a network call.
- No `@tanstack/react-query` or other cache/mutation library is introduced.
- `docker-compose.yml`'s Postgres service values must match `backend/internal/config`'s `DATABASE_URL` default: user `postgres`, password `postgres`, db `digital_library`, port `5432`.
- `backend/.env`, `frontend/.env.local` are never committed; `backend/.env.example`, `frontend/.env.local.example` always are.

---

### Task 1: Local Postgres via docker-compose

**Files:**
- Create: `docker-compose.yml`
- Modify: `README.md` (Database section)

**Interfaces:**
- Produces: a `postgres` service reachable at `localhost:5432` with database `digital_library`, user/password `postgres`/`postgres` — every later task that talks to a real database assumes this is running.

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: digital_library
    ports:
      - '5432:5432'
    volumes:
      - digital-library-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres -d digital_library']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  digital-library-postgres-data:
```

- [ ] **Step 2: Start it and verify health**

Run: `docker compose up -d && docker compose ps`
Expected: the `postgres` service shows `running (healthy)` (allow a few seconds, re-run `docker compose ps` if it still says `starting`).

- [ ] **Step 3: Update `README.md`'s Database section**

Replace:
```markdown
The backend needs a local Postgres instance. Start one with Docker:

```bash
docker run --name digital-library-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=digital_library -p 5432:5432 -d postgres:16
```
```

With:
```markdown
The backend needs a local Postgres instance. Start one with Docker
Compose:

```bash
docker compose up -d
```
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml README.md
git commit -m "feat(books-dashboard): start local Postgres via docker-compose"
```

---

### Task 2: Backend loads local config from `.env`

**Files:**
- Create: `backend/.env.example`
- Create: `backend/.env` (gitignored, not committed)
- Create: `backend/cmd/server/dotenv.go`
- Test: `backend/cmd/server/dotenv_test.go`
- Modify: `backend/cmd/server/main.go`
- Modify: `backend/go.mod`, `backend/go.sum` (via `go get`)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `loadDotEnv() error` in package `main` (`backend/cmd/server`), called at the top of `run()` before `config.Load()`.

- [ ] **Step 1: Write the failing test**

Create `backend/cmd/server/dotenv_test.go`:

```go
package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnv(t *testing.T) {
	t.Run("loads values from a present .env file", func(t *testing.T) {
		dir := t.TempDir()
		envPath := filepath.Join(dir, ".env")
		if err := os.WriteFile(envPath, []byte("BOOKS_DASHBOARD_TEST_VAR=from-dotenv\n"), 0o600); err != nil {
			t.Fatalf("writing .env fixture: %v", err)
		}

		cwd, err := os.Getwd()
		if err != nil {
			t.Fatalf("getting cwd: %v", err)
		}
		t.Cleanup(func() {
			if err := os.Chdir(cwd); err != nil {
				t.Fatalf("restoring cwd: %v", err)
			}
			os.Unsetenv("BOOKS_DASHBOARD_TEST_VAR")
		})
		if err := os.Chdir(dir); err != nil {
			t.Fatalf("chdir into fixture dir: %v", err)
		}

		if err := loadDotEnv(); err != nil {
			t.Fatalf("loadDotEnv() error = %v", err)
		}

		if got := os.Getenv("BOOKS_DASHBOARD_TEST_VAR"); got != "from-dotenv" {
			t.Errorf("BOOKS_DASHBOARD_TEST_VAR = %q, want %q", got, "from-dotenv")
		}
	})

	t.Run("does not error when .env is absent", func(t *testing.T) {
		dir := t.TempDir()
		cwd, err := os.Getwd()
		if err != nil {
			t.Fatalf("getting cwd: %v", err)
		}
		t.Cleanup(func() {
			if err := os.Chdir(cwd); err != nil {
				t.Fatalf("restoring cwd: %v", err)
			}
		})
		if err := os.Chdir(dir); err != nil {
			t.Fatalf("chdir into fixture dir: %v", err)
		}

		if err := loadDotEnv(); err != nil {
			t.Fatalf("loadDotEnv() error = %v, want nil", err)
		}
	})
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && go test ./cmd/server/... -run TestLoadDotEnv -v`
Expected: FAIL — `undefined: loadDotEnv`

- [ ] **Step 3: Add the `godotenv` dependency**

Run: `cd backend && go get github.com/joho/godotenv`
Expected: `backend/go.mod` and `backend/go.sum` gain the new require entry.

- [ ] **Step 4: Implement `loadDotEnv`**

Create `backend/cmd/server/dotenv.go`:

```go
package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// loadDotEnv loads environment variables from a .env file in the current
// working directory, if one is present. A missing file is not an error —
// production and CI environments set variables directly, with no .env
// file on disk.
func loadDotEnv() error {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("loading .env: %w", err)
	}
	return nil
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && go test ./cmd/server/... -run TestLoadDotEnv -v`
Expected: PASS (both subtests)

- [ ] **Step 6: Wire `loadDotEnv` into `run()`**

In `backend/cmd/server/main.go`, change:

```go
func run() error {
	cfg := config.Load()
```

to:

```go
func run() error {
	if err := loadDotEnv(); err != nil {
		slog.Error("loading .env", "error", err)
		return err
	}

	cfg := config.Load()
```

- [ ] **Step 7: Run the full backend test suite**

Run: `cd backend && go test ./...`
Expected: PASS

- [ ] **Step 8: Create `backend/.env.example`**

```dotenv
# Copy to .env and adjust for your local setup. Values below match
# docker-compose.yml and backend/internal/config's built-in defaults.
PORT=8080
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable
# Only used by backend/internal/store's integration tests. Point it at a
# separate database (e.g. digital_library_test) — running those tests
# truncates the books table in whatever database this points to.
TEST_DATABASE_URL=
```

- [ ] **Step 9: Create `backend/.env` from the example**

Run: `cd backend && cp .env.example .env`
Expected: `backend/.env` exists with the same content (adjust values only if your local Postgres differs from Task 1's `docker-compose.yml`).

- [ ] **Step 10: Track the example file in git**

In `.gitignore`, change:

```
# Environment
.env*
!.env.local.example
```

to:

```
# Environment
.env*
!.env.local.example
!backend/.env.example
```

- [ ] **Step 11: Verify tracked/untracked status**

Run: `git status --short backend/.env backend/.env.example`
Expected: `backend/.env.example` shows as untracked-but-addable (`??`) and `backend/.env` does **not** appear at all (already ignored by `.env*`).

- [ ] **Step 12: Commit**

```bash
git add backend/go.mod backend/go.sum backend/cmd/server/dotenv.go backend/cmd/server/dotenv_test.go backend/cmd/server/main.go backend/.env.example .gitignore
git commit -m "feat(books-dashboard): load backend config from .env locally"
```

---

### Task 3: Frontend `.env.local` review

**Files:**
- Modify (if needed): `frontend/.env.local.example`
- Create: `frontend/.env.local` (gitignored, not committed)

**Interfaces:**
- Produces: `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8080`, consumed by `getApiBaseUrl()` in `frontend/src/lib/api.ts` (unchanged in this task).

- [ ] **Step 1: Confirm `frontend/.env.local.example` is still accurate**

Read `frontend/.env.local.example` — it should read:

```dotenv
# Base URL of the backend API. Falls back to http://localhost:8080 if unset.
NEXT_PUBLIC_API_URL=http://localhost:8080
```

No change needed unless a later task adds a new frontend-only env var (none do in this plan).

- [ ] **Step 2: Create `frontend/.env.local` from the example**

Run: `cd frontend && cp .env.local.example .env.local`
Expected: `frontend/.env.local` exists with `NEXT_PUBLIC_API_URL=http://localhost:8080`.

- [ ] **Step 3: Verify it's untracked**

Run: `git status --short frontend/.env.local`
Expected: no output (already covered by the existing `.env*` gitignore rule).

- [ ] **Step 4: Commit**

Nothing to commit for this task (only gitignored local files were created) — skip the commit and proceed to Task 4.

---

### Task 4: Install frontend dependencies and shadcn components

**Files:**
- Modify: `frontend/package.json`, `frontend/pnpm-lock.yaml`
- Create: `frontend/src/components/ui/table.tsx`
- Create: `frontend/src/components/ui/drawer.tsx`
- Create: `frontend/src/components/ui/form.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/select.tsx`
- Create: `frontend/src/components/ui/label.tsx`
- Create: `frontend/src/components/ui/sonner.tsx`
- Modify: `frontend/src/app/layout.tsx`

**Interfaces:**
- Produces: `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` from `@/components/ui/table`; `Drawer`/`DrawerContent`/`DrawerHeader`/`DrawerTitle`/`DrawerDescription`/`DrawerFooter`/`DrawerClose` from `@/components/ui/drawer`; `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` from `@/components/ui/form`; `Input` from `@/components/ui/input`; `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` from `@/components/ui/select`; `toast` from `sonner` — all consumed by Tasks 7-12.

- [ ] **Step 1: Install the TanStack Table dependency**

Run: `cd frontend && pnpm add @tanstack/react-table`
Expected: `frontend/package.json` gains `@tanstack/react-table` under `dependencies`.

- [ ] **Step 2: Add the shadcn components**

Run: `cd frontend && pnpm dlx shadcn@latest add table drawer form input select label sonner`
Expected: the CLI writes `src/components/ui/table.tsx`, `drawer.tsx`, `form.tsx`, `input.tsx`, `select.tsx`, `label.tsx`, `sonner.tsx`, and adds `vaul`, `react-hook-form`, `@hookform/resolvers`, `zod`, `sonner`, and any missing `radix-ui`/`@radix-ui/react-*` primitives to `frontend/package.json`.

- [ ] **Step 3: Mount the toaster**

In `frontend/src/app/layout.tsx`, add the import and render `<Toaster />` once inside the body, after `{children}`:

```tsx
import { Toaster } from '@/components/ui/sonner';
```

```tsx
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <Header />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
```

- [ ] **Step 4: Verify the app still builds and lints**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/components/ui frontend/src/app/layout.tsx
git commit -m "feat(books-dashboard): add data table, drawer, form and toast components"
```

---

### Task 5: `fetchBooks` takes a page-based query

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/api.test.ts`

**Interfaces:**
- Consumes: existing `getApiBaseUrl()`, `Book` type (unchanged).
- Produces: `DEFAULT_BOOKS_PAGE_SIZE: number`, `BOOKS_PAGE_SIZE_OPTIONS: readonly [10, 20, 50]`, `BooksQuery = { page: number; pageSize: number; search?: string; genre?: string }`, `fetchBooks(query?: BooksQuery): Promise<BooksResult>` — consumed by Task 12's `BooksDashboard`.

- [ ] **Step 1: Write the failing test**

Replace the contents of `frontend/src/lib/api.test.ts`'s `fetchBooks` describe block (keep the `afterEach`/imports, replace the `describe('fetchBooks', ...)` body) with:

```ts
describe('fetchBooks', () => {
  it('returns books and total on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            books: [
              {
                id: 1,
                title: 'Dune',
                author: 'Frank Herbert',
                year: 1965,
                genre: 'Sci-Fi',
                coverUrl: null,
              },
            ],
            total: 1,
          }),
      }),
    );

    const result = await fetchBooks({ page: 1, pageSize: 10 });

    expect(result).toEqual({
      ok: true,
      books: [
        {
          id: 1,
          title: 'Dune',
          author: 'Frank Herbert',
          year: 1965,
          genre: 'Sci-Fi',
          coverUrl: null,
        },
      ],
      total: 1,
    });
  });

  it('returns an empty list when the library has no books', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ books: [], total: 0 }),
      }),
    );

    const result = await fetchBooks({ page: 1, pageSize: 10 });

    expect(result).toEqual({ ok: true, books: [], total: 0 });
  });

  it('returns an error when the backend responds with a non-200 status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const result = await fetchBooks({ page: 1, pageSize: 10 });

    expect(result).toEqual({ ok: false, error: 'backend responded with 500' });
  });

  it('returns an error when the network request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    const result = await fetchBooks({ page: 1, pageSize: 10 });

    expect(result).toEqual({ ok: false, error: 'network down' });
  });

  it('translates page and pageSize into limit and offset', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchBooks({ page: 3, pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/books?limit=10&offset=20'),
      expect.any(Object),
    );
  });

  it('defaults to the first page at the default page size when called without arguments', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchBooks();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/books?limit=10&offset=0'),
      expect.any(Object),
    );
  });

  it('never includes search or genre in the request, even when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchBooks({ page: 1, pageSize: 10, search: 'dune', genre: 'Sci-Fi' });

    const [url] = fetchMock.mock.calls[0] as [string, unknown];
    expect(url).not.toContain('search');
    expect(url).not.toContain('genre');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && pnpm test -- api.test.ts`
Expected: FAIL — `fetchBooks({ page, pageSize })` doesn't match the current `fetchBooks(offset, limit)` signature (TypeScript errors and/or wrong query string assertions).

- [ ] **Step 3: Implement the new `fetchBooks`**

In `frontend/src/lib/api.ts`, replace:

```ts
export const BOOKS_PAGE_SIZE = 50;
```

through the end of `fetchBooks` with:

```ts
export const DEFAULT_BOOKS_PAGE_SIZE = 10;
export const BOOKS_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type BooksQuery = {
  page: number;
  pageSize: number;
  search?: string;
  genre?: string;
};

export type BooksResult =
  { ok: true; books: Book[]; total: number } | { ok: false; error: string };

/**
 * Fetches a page of books from the backend's /books endpoint and
 * normalizes both network failures and non-200 responses into a
 * BooksResult the UI can render without throwing. `search`/`genre` on
 * BooksQuery are accepted for forward-compatibility with server-side
 * filtering but are intentionally not sent yet.
 */
export async function fetchBooks(
  query: BooksQuery = { page: 1, pageSize: DEFAULT_BOOKS_PAGE_SIZE },
): Promise<BooksResult> {
  const { page, pageSize } = query;
  const offset = (page - 1) * pageSize;
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/books?limit=${pageSize}&offset=${offset}`,
      { cache: 'no-store', signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) {
      return { ok: false, error: `backend responded with ${res.status}` };
    }
    const body = (await res.json()) as { books: Book[]; total: number };
    return { ok: true, books: body.books ?? [], total: body.total };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}
```

Keep the existing `Book` type as-is.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/api.test.ts
git commit -m "feat(books-dashboard): fetch books by page instead of offset/limit"
```

---

### Task 6: Book management API stubs

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/api.test.ts`

**Interfaces:**
- Produces: `BookInput = { title: string; author: string; year?: number; genre?: string; coverUrl?: string }`, `MutationResult = { ok: true } | { ok: false; error: 'not_implemented' }`, `createBook(input: BookInput): Promise<MutationResult>`, `updateBook(id: number, input: BookInput): Promise<MutationResult>`, `deleteBook(id: number): Promise<MutationResult>` — consumed by Task 10 (`BookFormDrawer`) and Task 11 (`DeleteBookDrawer`).

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/lib/api.test.ts`:

```ts
describe('createBook', () => {
  it('resolves with not_implemented without making a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await createBook({ title: 'Dune', author: 'Frank Herbert' });

    expect(result).toEqual({ ok: false, error: 'not_implemented' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('updateBook', () => {
  it('resolves with not_implemented without making a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await updateBook(1, { title: 'Dune', author: 'Frank Herbert' });

    expect(result).toEqual({ ok: false, error: 'not_implemented' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('deleteBook', () => {
  it('resolves with not_implemented without making a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await deleteBook(1);

    expect(result).toEqual({ ok: false, error: 'not_implemented' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

Update the top-level import in the same file from:

```ts
import { fetchBooks } from '@/lib/api';
```

to:

```ts
import { createBook, deleteBook, fetchBooks, updateBook } from '@/lib/api';
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && pnpm test -- api.test.ts`
Expected: FAIL — `createBook`/`updateBook`/`deleteBook` are not exported from `@/lib/api`.

- [ ] **Step 3: Implement the stubs**

Append to `frontend/src/lib/api.ts`:

```ts
export type BookInput = {
  title: string;
  author: string;
  year?: number;
  genre?: string;
  coverUrl?: string;
};

export type MutationResult =
  { ok: true } | { ok: false; error: 'not_implemented' };

/**
 * Stub for creating a book. Always reports "not implemented" — a
 * follow-up change will replace this with a real POST /books call.
 */
export async function createBook(input: BookInput): Promise<MutationResult> {
  void input;
  return { ok: false, error: 'not_implemented' };
}

/**
 * Stub for updating a book. Always reports "not implemented" — a
 * follow-up change will replace this with a real PATCH /books/:id call.
 */
export async function updateBook(
  id: number,
  input: BookInput,
): Promise<MutationResult> {
  void id;
  void input;
  return { ok: false, error: 'not_implemented' };
}

/**
 * Stub for deleting a book. Always reports "not implemented" — a
 * follow-up change will replace this with a real DELETE /books/:id call.
 */
export async function deleteBook(id: number): Promise<MutationResult> {
  void id;
  return { ok: false, error: 'not_implemented' };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/api.test.ts
git commit -m "feat(books-dashboard): add not-implemented book management API stubs"
```

---

### Task 7: Book table column definitions

**Files:**
- Create: `frontend/src/components/books/columns.tsx`
- Test: `frontend/src/components/books/columns.test.tsx`

**Interfaces:**
- Consumes: `Book` type from `@/lib/api` (Task 5, unchanged shape).
- Produces: `createBooksColumns({ onEdit, onDelete }: { onEdit: (book: Book) => void; onDelete: (book: Book) => void }): ColumnDef<Book>[]` — consumed by Task 12 (`BooksDashboard`).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/books/columns.test.tsx`:

```tsx
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createBooksColumns } from '@/components/books/columns';
import type { Book } from '@/lib/api';

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: 1,
    title: 'Dune',
    author: 'Frank Herbert',
    year: 1965,
    genre: 'Sci-Fi',
    coverUrl: null,
    ...overrides,
  };
}

function TestTable({ data, onEdit, onDelete }: {
  data: Book[];
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}) {
  const table = useReactTable({
    data,
    columns: createBooksColumns({ onEdit, onDelete }),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

describe('createBooksColumns', () => {
  it('renders title, author, year and genre', () => {
    render(<TestTable data={[book()]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('Frank Herbert')).toBeInTheDocument();
    expect(screen.getByText('1965')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
  });

  it('shows a placeholder instead of a cover image when coverUrl is absent', () => {
    render(
      <TestTable data={[book({ coverUrl: null })]} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Нет')).toBeInTheDocument();
  });

  it('shows em dashes for missing year and genre', () => {
    render(
      <TestTable
        data={[book({ year: null, genre: null })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('calls onEdit when the row menu\'s "Изменить" item is activated', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<TestTable data={[book()]} onEdit={onEdit} onDelete={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Действия с книгой' }));
    await user.click(await screen.findByText('Изменить'));

    expect(onEdit).toHaveBeenCalledWith(book());
  });

  it('calls onDelete when the row menu\'s "Удалить" item is activated', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TestTable data={[book()]} onEdit={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Действия с книгой' }));
    await user.click(await screen.findByText('Удалить'));

    expect(onDelete).toHaveBeenCalledWith(book());
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && pnpm test -- columns.test.tsx`
Expected: FAIL — `Cannot find module '@/components/books/columns'`

- [ ] **Step 3: Implement `columns.tsx`**

Create `frontend/src/components/books/columns.tsx`:

```tsx
'use client';

import { MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import { type ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Book } from '@/lib/api';

export function createBooksColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}): ColumnDef<Book>[] {
  return [
    {
      accessorKey: 'coverUrl',
      header: 'Обложка',
      enableSorting: false,
      cell: ({ row }) => {
        const coverUrl = row.original.coverUrl;
        if (!coverUrl) {
          return (
            <div className="bg-muted text-muted-foreground flex h-16 w-11 items-center justify-center rounded text-[10px]">
              Нет
            </div>
          );
        }
        return (
          <Image
            src={coverUrl}
            alt={`Обложка книги «${row.original.title}»`}
            width={44}
            height={64}
            className="h-16 w-11 rounded object-cover"
          />
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Название',
    },
    {
      accessorKey: 'author',
      header: 'Автор',
    },
    {
      accessorKey: 'year',
      header: 'Год',
      cell: ({ row }) => row.original.year ?? '—',
    },
    {
      accessorKey: 'genre',
      header: 'Жанр',
      cell: ({ row }) => row.original.genre ?? '—',
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Действия с книгой"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              Изменить
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(row.original)}
            >
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- columns.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/books/columns.tsx frontend/src/components/books/columns.test.tsx
git commit -m "feat(books-dashboard): add book table column definitions"
```

---

### Task 8: Data table with page-based pagination

**Files:**
- Create: `frontend/src/components/books/data-table.tsx`
- Test: `frontend/src/components/books/data-table.test.tsx`

**Interfaces:**
- Consumes: `ColumnDef<TData>[]` (Task 7's `createBooksColumns` output), `BOOKS_PAGE_SIZE_OPTIONS` re-exported here for the page-size select.
- Produces: `BooksDataTable<TData>({ columns, data, page, pageSize, total, onPageChange, onPageSizeChange })` — consumed by Task 12 (`BooksDashboard`).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/books/data-table.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';

import { BooksDataTable } from '@/components/books/data-table';

type Row = { id: number; name: string };

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name' },
];

describe('BooksDataTable', () => {
  it('renders one row per data item', () => {
    render(
      <BooksDataTable
        columns={columns}
        data={[{ id: 1, name: 'Dune' }, { id: 2, name: '1984' }]}
        page={1}
        pageSize={10}
        total={2}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('1984')).toBeInTheDocument();
  });

  it('shows an empty-library message when there are no rows', () => {
    render(
      <BooksDataTable
        columns={columns}
        data={[]}
        page={1}
        pageSize={10}
        total={0}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('В библиотеке пока нет книг.')).toBeInTheDocument();
  });

  it('disables "Назад" on the first page and "Вперёд" on the last page', () => {
    render(
      <BooksDataTable
        columns={columns}
        data={[{ id: 1, name: 'Dune' }]}
        page={1}
        pageSize={10}
        total={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Вперёд' })).toBeDisabled();
  });

  it('calls onPageChange with the next page number', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <BooksDataTable
        columns={columns}
        data={[{ id: 1, name: 'Dune' }]}
        page={1}
        pageSize={10}
        total={20}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Вперёд' }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && pnpm test -- data-table.test.tsx`
Expected: FAIL — `Cannot find module '@/components/books/data-table'`

- [ ] **Step 3: Implement `data-table.tsx`**

Create `frontend/src/components/books/data-table.tsx`:

```tsx
'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BOOKS_PAGE_SIZE_OPTIONS } from '@/lib/api';

export function BooksDataTable<TData>({
  columns,
  data,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize },
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  В библиотеке пока нет книг.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOOKS_PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} на странице
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Назад
          </Button>
          <span className="text-muted-foreground text-sm">
            Страница {page} из {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- data-table.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/books/data-table.tsx frontend/src/components/books/data-table.test.tsx
git commit -m "feat(books-dashboard): add page-based data table"
```

---

### Task 9: Filter toolbar scaffold

**Files:**
- Create: `frontend/src/components/books/toolbar.tsx`
- Test: `frontend/src/components/books/toolbar.test.tsx`

**Interfaces:**
- Produces: `BOOK_GENRE_OPTIONS: readonly string[]`, `BooksToolbar({ onAddBook }: { onAddBook: () => void })` — consumed by Task 12 (`BooksDashboard`). Reads/writes `search`/`genre` URL params via `next/navigation`; never calls `fetchBooks`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/books/toolbar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replaceMock = vi.fn();
let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchParams,
}));

import { BooksToolbar } from '@/components/books/toolbar';

describe('BooksToolbar', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    replaceMock.mockClear();
  });

  it('updates the URL search param when typing in the search field, without calling onAddBook', async () => {
    const user = userEvent.setup();
    render(<BooksToolbar onAddBook={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText('Поиск по названию или автору'),
      'dune',
    );

    expect(replaceMock).toHaveBeenLastCalledWith(
      expect.stringContaining('search=dune'),
      { scroll: false },
    );
  });

  it('updates the URL genre param when a genre is selected', async () => {
    const user = userEvent.setup();
    render(<BooksToolbar onAddBook={vi.fn()} />);

    await user.click(screen.getByRole('combobox', { name: 'Жанр' }));
    await user.click(await screen.findByRole('option', { name: 'Детектив' }));

    expect(replaceMock).toHaveBeenLastCalledWith(
      expect.stringContaining('genre=%D0%94%D0%B5%D1%82%D0%B5%D0%BA%D1%82%D0%B8%D0%B2'),
      { scroll: false },
    );
  });

  it('initializes its controls from existing URL search params', () => {
    searchParams = new URLSearchParams('search=dune&genre=Фантастика');

    render(<BooksToolbar onAddBook={vi.fn()} />);

    expect(
      screen.getByPlaceholderText('Поиск по названию или автору'),
    ).toHaveValue('dune');
    expect(screen.getByText('Фантастика')).toBeInTheDocument();
  });

  it('calls onAddBook when the "Добавить книгу" button is activated', async () => {
    const user = userEvent.setup();
    const onAddBook = vi.fn();
    render(<BooksToolbar onAddBook={onAddBook} />);

    await user.click(screen.getByRole('button', { name: 'Добавить книгу' }));

    expect(onAddBook).toHaveBeenCalledTimes(1);
  });
});
```


- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && pnpm test -- toolbar.test.tsx`
Expected: FAIL — `Cannot find module '@/components/books/toolbar'`

- [ ] **Step 3: Implement `toolbar.tsx`**

Create `frontend/src/components/books/toolbar.tsx`:

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Placeholder options — not sourced from the backend. A follow-up change
// wiring real server-side filtering should replace this with a live list.
export const BOOK_GENRE_OPTIONS = [
  'Фантастика',
  'Фэнтези',
  'Детектив',
  'Роман',
  'Нон-фикшн',
  'Биография',
  'Поэзия',
  'Другое',
] as const;

export function BooksToolbar({ onAddBook }: { onAddBook: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [genre, setGenre] = useState(searchParams.get('genre') ?? '');

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Поиск по названию или автору"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          updateParam('search', event.target.value);
        }}
        className="max-w-xs"
      />
      <Select
        value={genre || undefined}
        onValueChange={(value) => {
          setGenre(value);
          updateParam('genre', value);
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Жанр" />
        </SelectTrigger>
        <SelectContent>
          {BOOK_GENRE_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button className="ml-auto" onClick={onAddBook}>
        Добавить книгу
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- toolbar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/books/toolbar.tsx frontend/src/components/books/toolbar.test.tsx
git commit -m "feat(books-dashboard): add inert filter toolbar scaffold"
```

---

### Task 10: Add/edit book drawer

**Files:**
- Create: `frontend/src/components/books/book-form-drawer.tsx`
- Test: `frontend/src/components/books/book-form-drawer.test.tsx`

**Interfaces:**
- Consumes: `createBook`, `updateBook`, `Book`, `BookInput` from `@/lib/api` (Task 6).
- Produces: `BookFormDrawer({ open, onOpenChange, book }: { open: boolean; onOpenChange: (open: boolean) => void; book?: Book })` — consumed by Task 12.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/books/book-form-drawer.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BookFormDrawer } from '@/components/books/book-form-drawer';
import * as api from '@/lib/api';

describe('BookFormDrawer', () => {
  it('shows "Добавить книгу" and empty fields when no book is passed', () => {
    render(<BookFormDrawer open onOpenChange={vi.fn()} />);

    expect(screen.getByText('Добавить книгу')).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toHaveValue('');
  });

  it('pre-fills fields and shows "Изменить книгу" when a book is passed', () => {
    render(
      <BookFormDrawer
        open
        onOpenChange={vi.fn()}
        book={{
          id: 1,
          title: 'Dune',
          author: 'Frank Herbert',
          year: 1965,
          genre: 'Sci-Fi',
          coverUrl: null,
        }}
      />,
    );

    expect(screen.getByText('Изменить книгу')).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toHaveValue('Dune');
  });

  it('blocks submission and shows a validation error when title is empty', async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(api, 'createBook');
    render(<BookFormDrawer open onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText('Автор'), 'Frank Herbert');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Укажите название')).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('calls createBook and shows a toast on valid submit, without closing via a real save', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'createBook').mockResolvedValue({
      ok: false,
      error: 'not_implemented',
    });
    render(<BookFormDrawer open onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText('Название'), 'Dune');
    await user.type(screen.getByLabelText('Автор'), 'Frank Herbert');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(api.createBook).toHaveBeenCalledWith({
        title: 'Dune',
        author: 'Frank Herbert',
        year: undefined,
        genre: undefined,
        coverUrl: undefined,
      }),
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && pnpm test -- book-form-drawer.test.tsx`
Expected: FAIL — `Cannot find module '@/components/books/book-form-drawer'`

- [ ] **Step 3: Implement `book-form-drawer.tsx`**

Create `frontend/src/components/books/book-form-drawer.tsx`:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  createBook,
  updateBook,
  type Book,
  type BookInput,
} from '@/lib/api';

const bookFormSchema = z.object({
  title: z.string().min(1, 'Укажите название'),
  author: z.string().min(1, 'Укажите автора'),
  year: z.string(),
  genre: z.string(),
  coverUrl: z.string(),
});

type BookFormValues = z.infer<typeof bookFormSchema>;

function toDefaultValues(book?: Book): BookFormValues {
  return {
    title: book?.title ?? '',
    author: book?.author ?? '',
    year: book?.year ? String(book.year) : '',
    genre: book?.genre ?? '',
    coverUrl: book?.coverUrl ?? '',
  };
}

export function BookFormDrawer({
  open,
  onOpenChange,
  book,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book;
}) {
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    values: toDefaultValues(book),
  });

  async function onSubmit(values: BookFormValues) {
    const input: BookInput = {
      title: values.title,
      author: values.author,
      year: values.year ? Number(values.year) : undefined,
      genre: values.genre || undefined,
      coverUrl: values.coverUrl || undefined,
    };

    await (book ? updateBook(book.id, input) : createBook(input));

    toast('Функция скоро появится', {
      description: 'Сохранение книг пока не подключено к серверу.',
    });
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {book ? 'Изменить книгу' : 'Добавить книгу'}
          </DrawerTitle>
          <DrawerDescription>
            {book ? 'Обновите данные книги.' : 'Заполните данные новой книги.'}
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Автор</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Год</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Жанр</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coverUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ссылка на обложку</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DrawerFooter className="px-0">
              <Button type="submit">Сохранить</Button>
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  type="button"
                >
                  Отмена
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- book-form-drawer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/books/book-form-drawer.tsx frontend/src/components/books/book-form-drawer.test.tsx
git commit -m "feat(books-dashboard): add add/edit book drawer with not-implemented submit"
```

---

### Task 11: Delete book confirmation drawer

**Files:**
- Create: `frontend/src/components/books/delete-book-drawer.tsx`
- Test: `frontend/src/components/books/delete-book-drawer.test.tsx`

**Interfaces:**
- Consumes: `deleteBook`, `Book` from `@/lib/api` (Task 6).
- Produces: `DeleteBookDrawer({ open, onOpenChange, book }: { open: boolean; onOpenChange: (open: boolean) => void; book: Book | null })` — consumed by Task 12.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/books/delete-book-drawer.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DeleteBookDrawer } from '@/components/books/delete-book-drawer';
import * as api from '@/lib/api';

const book = {
  id: 1,
  title: 'Dune',
  author: 'Frank Herbert',
  year: 1965,
  genre: 'Sci-Fi',
  coverUrl: null,
};

describe('DeleteBookDrawer', () => {
  it('asks for confirmation naming the book', () => {
    render(<DeleteBookDrawer open onOpenChange={vi.fn()} book={book} />);

    expect(
      screen.getByText('Вы уверены, что хотите удалить «Dune»?'),
    ).toBeInTheDocument();
  });

  it('calls deleteBook and closes when "Удалить" is confirmed', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    vi.spyOn(api, 'deleteBook').mockResolvedValue({
      ok: false,
      error: 'not_implemented',
    });

    render(
      <DeleteBookDrawer open onOpenChange={onOpenChange} book={book} />,
    );

    await user.click(screen.getByRole('button', { name: 'Удалить' }));

    await waitFor(() => expect(api.deleteBook).toHaveBeenCalledWith(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && pnpm test -- delete-book-drawer.test.tsx`
Expected: FAIL — `Cannot find module '@/components/books/delete-book-drawer'`

- [ ] **Step 3: Implement `delete-book-drawer.tsx`**

Create `frontend/src/components/books/delete-book-drawer.tsx`:

```tsx
'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { deleteBook, type Book } from '@/lib/api';

export function DeleteBookDrawer({
  open,
  onOpenChange,
  book,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book | null;
}) {
  async function handleConfirm() {
    if (!book) return;
    await deleteBook(book.id);
    toast('Функция скоро появится', {
      description: 'Удаление книг пока не подключено к серверу.',
    });
    onOpenChange(false);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Удалить книгу?</DrawerTitle>
          <DrawerDescription>
            {book ? `Вы уверены, что хотите удалить «${book.title}»?` : ''}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button
            variant="destructive"
            onClick={handleConfirm}
          >
            Удалить
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Отмена</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- delete-book-drawer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/books/delete-book-drawer.tsx frontend/src/components/books/delete-book-drawer.test.tsx
git commit -m "feat(books-dashboard): add delete book confirmation drawer"
```

---

### Task 12: Compose the dashboard, rewrite the page, remove the old grid

**Files:**
- Create: `frontend/src/components/books/books-dashboard.tsx`
- Test: `frontend/src/components/books/books-dashboard.test.tsx`
- Modify: `frontend/src/app/books/page.tsx`
- Delete: `frontend/src/app/books/page.test.tsx` (replaced by the new test below, same path)
- Delete: `frontend/src/components/books-browser.tsx`
- Delete: `frontend/src/components/books-browser.test.tsx`
- Delete: `frontend/src/components/book-card.tsx`
- Delete: `frontend/src/components/book-card.test.tsx`

**Interfaces:**
- Consumes: `fetchBooks`, `DEFAULT_BOOKS_PAGE_SIZE`, `Book` (Task 5); `createBooksColumns` (Task 7); `BooksDataTable` (Task 8); `BooksToolbar` (Task 9); `BookFormDrawer` (Task 10); `DeleteBookDrawer` (Task 11).
- Produces: `BooksDashboard()` (default export not needed — named export), rendered by `frontend/src/app/books/page.tsx`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/books/books-dashboard.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { BooksDashboard } from '@/components/books/books-dashboard';
import * as api from '@/lib/api';

function book(overrides: Partial<import('@/lib/api').Book> = {}) {
  return {
    id: 1,
    title: 'Dune',
    author: 'Frank Herbert',
    year: 1965,
    genre: 'Sci-Fi',
    coverUrl: null,
    ...overrides,
  };
}

describe('BooksDashboard', () => {
  it('shows a loading state, then renders fetched books', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [book()],
      total: 1,
    });

    render(<BooksDashboard />);

    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
    expect(await screen.findByText('Dune')).toBeInTheDocument();
  });

  it('shows the empty-library message when there are no books', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [],
      total: 0,
    });

    render(<BooksDashboard />);

    expect(
      await screen.findByText('В библиотеке пока нет книг.'),
    ).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: false,
      error: 'network down',
    });

    render(<BooksDashboard />);

    expect(
      await screen.findByText('Не удалось загрузить книги: network down'),
    ).toBeInTheDocument();
  });

  it('refetches with the next page when "Вперёд" is activated', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 20 });

    render(<BooksDashboard />);
    await screen.findByText('Dune');

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Вперёд' }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 }),
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && pnpm test -- books-dashboard.test.tsx`
Expected: FAIL — `Cannot find module '@/components/books/books-dashboard'`

- [ ] **Step 3: Implement `books-dashboard.tsx`**

Create `frontend/src/components/books/books-dashboard.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

import { BookFormDrawer } from '@/components/books/book-form-drawer';
import { createBooksColumns } from '@/components/books/columns';
import { BooksDataTable } from '@/components/books/data-table';
import { DeleteBookDrawer } from '@/components/books/delete-book-drawer';
import { BooksToolbar } from '@/components/books/toolbar';
import { DEFAULT_BOOKS_PAGE_SIZE, fetchBooks, type Book } from '@/lib/api';

export function BooksDashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_BOOKS_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchBooks({ page, pageSize }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBooks(result.books);
      setTotal(result.total);
    });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  const columns = createBooksColumns({
    onEdit: (book) => {
      setEditingBook(book);
      setFormOpen(true);
    },
    onDelete: (book) => setDeletingBook(book),
  });

  return (
    <div className="flex flex-col gap-4">
      <BooksToolbar
        onAddBook={() => {
          setEditingBook(undefined);
          setFormOpen(true);
        }}
      />
      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : error ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить книги: {error}
        </p>
      ) : (
        <BooksDataTable
          columns={columns}
          data={books}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
      <BookFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        book={editingBook}
      />
      <DeleteBookDrawer
        open={deletingBook !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingBook(null);
        }}
        book={deletingBook}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm test -- books-dashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Rewrite the page and delete the old grid**

Replace `frontend/src/app/books/page.tsx` with:

```tsx
import { Suspense } from 'react';

import { BooksDashboard } from '@/components/books/books-dashboard';

export default function BooksPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Моя библиотека</h1>
      <Suspense
        fallback={
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        }
      >
        <BooksDashboard />
      </Suspense>
    </main>
  );
}
```

Replace `frontend/src/app/books/page.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import BooksPage from '@/app/books/page';
import * as api from '@/lib/api';

describe('BooksPage', () => {
  it('renders the page title and the dashboard', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [],
      total: 0,
    });

    render(<BooksPage />);

    expect(screen.getByText('Моя библиотека')).toBeInTheDocument();
    expect(
      await screen.findByText('В библиотеке пока нет книг.'),
    ).toBeInTheDocument();
  });
});
```

Delete the now-unused files:

```bash
git rm frontend/src/components/books-browser.tsx frontend/src/components/books-browser.test.tsx frontend/src/components/book-card.tsx frontend/src/components/book-card.test.tsx
```

- [ ] **Step 6: Run the full frontend test suite, typecheck, and lint**

Run: `cd frontend && pnpm test && pnpm typecheck && pnpm lint`
Expected: all PASS, no references to the deleted files remain.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/books/books-dashboard.tsx frontend/src/components/books/books-dashboard.test.tsx frontend/src/app/books/page.tsx frontend/src/app/books/page.test.tsx
git commit -m "feat(books-dashboard): replace the card grid with the data table dashboard"
```

---

### Task 13: Update the `/books` e2e test

**Files:**
- Modify: the existing `/books` Playwright spec under `frontend/e2e/`

**Interfaces:**
- Consumes: the running dev stack (backend + Postgres from Task 1, migrated and seeded per the README).

- [ ] **Step 1: Locate the current spec**

Run: `grep -rl "books" frontend/e2e`
Expected: one file referencing the old "Показать ещё" grid — read it to see its exact current assertions before editing.

- [ ] **Step 2: Update the assertions for the data table**

Replace any assertion that looks for the card grid or the "Показать ещё" button with assertions against the new markup: the page title `Моя библиотека`, at least one table row (`page.getByRole('row')`) once loaded, and the pagination controls (`page.getByRole('button', { name: 'Вперёд' })`) instead of a "load more" button. Keep the existing navigation/setup steps (backend URL, seeded data expectations) unchanged.

- [ ] **Step 3: Run the e2e suite against a running stack**

Run (with `docker compose up -d`, migrations applied, and both `make backend`/`make frontend` running per the README): `cd frontend && pnpm test:e2e`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e
git commit -m "test(books-dashboard): update /books e2e test for the data table"
```

---

### Task 14: Documentation updates

**Files:**
- Modify: `README.md` (Configuration section)

**Interfaces:** none — documentation only.

- [ ] **Step 1: Update the Configuration section**

In `README.md`, extend the existing Configuration bullet list (Backend/Frontend env vars) with a note that both services also read a local `.env`/`.env.local` file (see `backend/.env.example` and `frontend/.env.local.example`), and that `backend/.env`/`frontend/.env.local` are gitignored — copy the corresponding `.example` file to get started.

- [ ] **Step 2: Proofread**

Run: `cd frontend && pnpm format -- ../README.md` (or open the file and confirm formatting/prose reads correctly — Prettier's Markdown formatting only, this does not lint content).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(books-dashboard): document local .env setup"
```

---

## Execution Handoff

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Requires `superpowers:subagent-driven-development`.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

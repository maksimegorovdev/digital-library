# Book List Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user browse their 1000+-book home library as a paginated card grid, backed by a new Postgres `books` table and a `GET /books` endpoint.

**Architecture:** A thin `internal/store` package wraps `database/sql` (via the `pgx/v5` stdlib driver) with one paginated query; a `GET /books` handler exposes it; the Next.js `/books` page renders the first page server-side and a small client component ("Load more") fetches subsequent pages. No ORM, no query builder, no search/sort/filter in this change.

**Tech Stack:** Go (`chi`, `database/sql`, `jackc/pgx/v5`, `golang-migrate`), Next.js App Router + TypeScript + shadcn/ui + Tailwind v4, Vitest + Testing Library, Playwright.

**Spec:** `openspec/changes/screen-list-books/specs/book-catalog/spec.md` and `openspec/changes/screen-list-books/design.md` — read both before starting; this plan implements their requirements task-by-task.

## Global Constraints

- Books have mandatory `title`/`author` and optional `year`/`genre`/`cover_url` (spec: Book Storage).
- `GET /books` is ordered by `author, title, id` and defaults to `limit=50, offset=0` (spec: List Books Endpoint).
- No search, sort, filter, or alphabetical grouping in this change (design.md Non-Goals).
- No add/edit/delete UI in this change — books arrive only via the seed migration (design.md Non-Goals).
- Missing optional fields must render gracefully (placeholder cover, no broken image) — never throw (spec: Book List Page).
- Empty library shows a message with no call-to-action; backend errors show a message instead of the grid (spec: Book List Page).
- "Load more" is hidden once every book is loaded (spec: Load More Pagination).

---

## Task 1: Books table migration + seed data

**Files:**
- Create: `backend/migrations/000001_create_books.up.sql`
- Create: `backend/migrations/000001_create_books.down.sql`
- Create: `backend/migrations/000002_seed_books.up.sql`
- Create: `backend/migrations/000002_seed_books.down.sql`

**Interfaces:**
- Produces: a `books` table with columns `id BIGSERIAL PRIMARY KEY`, `title TEXT NOT NULL`, `author TEXT NOT NULL`, `year INTEGER`, `genre TEXT`, `cover_url TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, seeded with 8 rows (Task 3's `ListBooks` reads from this table).

- [ ] **Step 1: Install `golang-migrate` locally (one-time, not committed)**

Run: `brew install golang-migrate` (macOS) or see https://github.com/golang-migrate/migrate/tree/master/cmd/migrate for other platforms.
Expected: `migrate -version` prints a version.

- [ ] **Step 2: Start a local Postgres for development**

Run: `docker run --name digital-library-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=digital_library -p 5432:5432 -d postgres:16`
Expected: `docker ps` shows the `digital-library-db` container running.

- [ ] **Step 3: Write the create-table migration**

`backend/migrations/000001_create_books.up.sql`:
```sql
CREATE TABLE books (
    id         BIGSERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    author     TEXT NOT NULL,
    year       INTEGER,
    genre      TEXT,
    cover_url  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`backend/migrations/000001_create_books.down.sql`:
```sql
DROP TABLE books;
```

- [ ] **Step 4: Write the seed migration**

`backend/migrations/000002_seed_books.up.sql`:
```sql
INSERT INTO books (title, author, year, genre, cover_url) VALUES
    ('Dune', 'Frank Herbert', 1965, 'Science Fiction', 'https://picsum.photos/seed/dune/300/450'),
    ('Мастер и Маргарита', 'Михаил Булгаков', 1967, 'Magical Realism', 'https://picsum.photos/seed/master-margarita/300/450'),
    ('The Hobbit', 'J.R.R. Tolkien', 1937, 'Fantasy', 'https://picsum.photos/seed/hobbit/300/450'),
    ('1984', 'George Orwell', 1949, 'Dystopian', NULL),
    ('Преступление и наказание', 'Фёдор Достоевский', NULL, 'Classic', 'https://picsum.photos/seed/crime-punishment/300/450'),
    ('Sapiens', 'Yuval Noah Harari', 2011, NULL, 'https://picsum.photos/seed/sapiens/300/450'),
    ('Незнакомая книга', 'Неизвестный автор', NULL, NULL, NULL),
    ('Clean Code', 'Robert C. Martin', 2008, 'Programming', 'https://picsum.photos/seed/clean-code/300/450');
```

`backend/migrations/000002_seed_books.down.sql`:
```sql
DELETE FROM books WHERE title IN (
    'Dune',
    'Мастер и Маргарита',
    'The Hobbit',
    '1984',
    'Преступление и наказание',
    'Sapiens',
    'Незнакомая книга',
    'Clean Code'
);
```

- [ ] **Step 5: Apply the migrations and verify**

Run: `migrate -database "postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" -path backend/migrations up`
Expected: no errors; `docker exec -it digital-library-db psql -U postgres -d digital_library -c "SELECT count(*) FROM books;"` prints `8`.

- [ ] **Step 6: Commit**

```bash
git add backend/migrations
git commit -m "feat(backend): add books table migration and seed data"
```

---

## Task 2: Backend config — `DATABASE_URL`

**Files:**
- Modify: `backend/internal/config/config.go`
- Modify: `backend/internal/config/config_test.go`

**Interfaces:**
- Produces: `config.Config.DatabaseURL string` — consumed by Task 4 (`main.go`) to open the DB pool.

- [ ] **Step 1: Write the failing test**

Add to `backend/internal/config/config_test.go` (extend the existing table-driven `TestLoad`):
```go
func TestLoadDatabaseURL(t *testing.T) {
	tests := []struct {
		name        string
		databaseEnv string
		expected    string
	}{
		{
			name:        "default when unset",
			databaseEnv: "",
			expected:    "postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable",
		},
		{
			name:        "explicit value",
			databaseEnv: "postgres://user:pass@db:5432/mydb",
			expected:    "postgres://user:pass@db:5432/mydb",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("DATABASE_URL", tt.databaseEnv)

			cfg := config.Load()

			if cfg.DatabaseURL != tt.expected {
				t.Errorf("DatabaseURL = %q, want %q", cfg.DatabaseURL, tt.expected)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/config/... -run TestLoadDatabaseURL -v`
Expected: FAIL — `cfg.DatabaseURL undefined` (field doesn't exist yet).

- [ ] **Step 3: Add `DatabaseURL` to `Config`**

In `backend/internal/config/config.go`, add the field and default:
```go
// Config holds the backend's runtime configuration.
type Config struct {
	// Port is the TCP port the HTTP server listens on.
	Port string
	// FrontendOrigin is the origin allowed by CORS for browser requests.
	FrontendOrigin string
	// DatabaseURL is the Postgres connection string.
	DatabaseURL string
}

// Load reads configuration from environment variables, applying defaults
// for local development when a variable is unset.
func Load() Config {
	return Config{
		Port:           envOrDefault("PORT", "8080"),
		FrontendOrigin: envOrDefault("FRONTEND_ORIGIN", "http://localhost:3000"),
		DatabaseURL:    envOrDefault("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable"),
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/config/... -v`
Expected: PASS (`TestLoad` and `TestLoadDatabaseURL`).

- [ ] **Step 5: Commit**

```bash
git add backend/internal/config
git commit -m "feat(backend): add DATABASE_URL config"
```

---

## Task 3: `internal/store` — `Book` + `ListBooks`

**Files:**
- Create: `backend/internal/store/books.go`
- Create: `backend/internal/store/books_test.go`
- Modify: `backend/go.mod`, `backend/go.sum` (via `go get`)

**Interfaces:**
- Produces: `store.Book{ID int64, Title string, Author string, Year *int, Genre *string, CoverURL *string}` with `json` tags (`id, title, author, year, genre, coverUrl`); `store.New(db *sql.DB) *Store`; `func (s *Store) ListBooks(ctx context.Context, limit, offset int) ([]Book, int, error)` — used by Task 4 (`main.go`) and Task 5 (the HTTP handler, via a package-local `bookLister` interface it satisfies structurally).

- [ ] **Step 1: Add the `pgx/v5` dependency**

Run: `cd backend && go get github.com/jackc/pgx/v5`
Expected: `go.mod`/`go.sum` updated with `github.com/jackc/pgx/v5`.

- [ ] **Step 2: Write the failing integration test**

`backend/internal/store/books_test.go`:
```go
package store_test

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/digital-library/backend/internal/store"
)

func testDB(t *testing.T) *sql.DB {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping store integration test")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("opening test database: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	if _, err := db.ExecContext(context.Background(), "TRUNCATE books RESTART IDENTITY"); err != nil {
		t.Fatalf("truncating books table: %v", err)
	}

	return db
}

func seedBook(t *testing.T, db *sql.DB, title, author string, year *int, genre, coverURL *string) {
	t.Helper()

	_, err := db.ExecContext(context.Background(),
		`INSERT INTO books (title, author, year, genre, cover_url) VALUES ($1, $2, $3, $4, $5)`,
		title, author, year, genre, coverURL,
	)
	if err != nil {
		t.Fatalf("seeding book: %v", err)
	}
}

func intPtr(v int) *int       { return &v }
func strPtr(v string) *string { return &v }

func TestListBooksOrdersByAuthorTitleID(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	seedBook(t, db, "Book B", "Author Z", nil, nil, nil)
	seedBook(t, db, "Book A", "Author A", intPtr(2020), strPtr("Fiction"), strPtr("https://example.com/a.jpg"))

	books, total, err := s.ListBooks(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 2 {
		t.Fatalf("total = %d, want 2", total)
	}
	if len(books) != 2 {
		t.Fatalf("len(books) = %d, want 2", len(books))
	}
	if books[0].Author != "Author A" || books[1].Author != "Author Z" {
		t.Fatalf("books not ordered by author: got %+v", books)
	}
	if books[0].Year == nil || *books[0].Year != 2020 {
		t.Fatalf("books[0].Year = %v, want 2020", books[0].Year)
	}
	if books[1].Year != nil {
		t.Fatalf("books[1].Year = %v, want nil", books[1].Year)
	}
}

func TestListBooksRespectsLimitAndOffset(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	for _, author := range []string{"Author A", "Author B", "Author C"} {
		seedBook(t, db, "Title", author, nil, nil, nil)
	}

	books, total, err := s.ListBooks(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 3 {
		t.Fatalf("total = %d, want 3", total)
	}
	if len(books) != 1 || books[0].Author != "Author B" {
		t.Fatalf("books = %+v, want [Author B]", books)
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" go test ./internal/store/... -v`
Expected: FAIL to compile — `package store` doesn't exist yet.

- [ ] **Step 4: Implement `internal/store/books.go`**

```go
// Package store provides database access for the backend's domain data.
package store

import (
	"context"
	"database/sql"
	"fmt"
)

// Book represents a single book in the home library.
type Book struct {
	ID       int64   `json:"id"`
	Title    string  `json:"title"`
	Author   string  `json:"author"`
	Year     *int    `json:"year"`
	Genre    *string `json:"genre"`
	CoverURL *string `json:"coverUrl"`
}

// Store provides access to persisted domain data.
type Store struct {
	db *sql.DB
}

// New returns a Store backed by db.
func New(db *sql.DB) *Store {
	return &Store{db: db}
}

// ListBooks returns a page of books ordered by author, then title, then
// id, along with the total number of books in the library.
func (s *Store) ListBooks(ctx context.Context, limit, offset int) ([]Book, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx, "SELECT count(*) FROM books").Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting books: %w", err)
	}

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, title, author, year, genre, cover_url
		   FROM books
		  ORDER BY author, title, id
		  LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("querying books: %w", err)
	}
	defer rows.Close()

	books := []Book{}
	for rows.Next() {
		var b Book
		if err := rows.Scan(&b.ID, &b.Title, &b.Author, &b.Year, &b.Genre, &b.CoverURL); err != nil {
			return nil, 0, fmt.Errorf("scanning book: %w", err)
		}
		books = append(books, b)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating books: %w", err)
	}

	return books, total, nil
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" go test ./internal/store/... -v`
Expected: PASS (both tests). Re-run `migrate ... up` first if the table isn't present in the test database.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/store backend/go.mod backend/go.sum
git commit -m "feat(backend): add store.ListBooks"
```

---

## Task 4: Wire the DB pool into `main.go`

**Files:**
- Modify: `backend/cmd/server/main.go`

**Interfaces:**
- Consumes: `config.Config.DatabaseURL` (Task 2), `store.New(db) *Store` and `store.Store.ListBooks` (Task 3), `httpapi.NewRouter(cfg, books)` (Task 5 — written after this task; `main.go`'s call is updated again in Task 5 Step 6).
- Produces: a live `*sql.DB` pool passed into the router at startup.

- [ ] **Step 1: Open the pool, ping it, and configure limits**

Modify `backend/cmd/server/main.go`:
```go
// Command server runs the digital-library backend HTTP API.
package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/digital-library/backend/internal/config"
	"github.com/digital-library/backend/internal/httpapi"
	"github.com/digital-library/backend/internal/store"
)

const (
	// readHeaderTimeout bounds how long the server waits to read a
	// request's headers, mitigating Slowloris-style attacks.
	readHeaderTimeout = 5 * time.Second
	// readTimeout bounds how long the server waits to read the full
	// request (headers + body).
	readTimeout = 10 * time.Second
	// writeTimeout bounds how long the server has to write a response.
	writeTimeout = 10 * time.Second

	maxOpenConns    = 25
	maxIdleConns    = 10
	connMaxLifetime = 5 * time.Minute
	connMaxIdleTime = time.Minute
	pingTimeout     = 5 * time.Second
)

func main() {
	cfg := config.Load()

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		slog.Error("opening database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	db.SetMaxOpenConns(maxOpenConns)
	db.SetMaxIdleConns(maxIdleConns)
	db.SetConnMaxLifetime(connMaxLifetime)
	db.SetConnMaxIdleTime(connMaxIdleTime)

	pingCtx, cancel := context.WithTimeout(context.Background(), pingTimeout)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		slog.Error("connecting to database", "error", err)
		os.Exit(1)
	}

	r := httpapi.NewRouter(cfg, store.New(db))

	addr := ":" + cfg.Port
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
	}

	slog.Info("backend listening", "addr", addr, "frontend_origin", cfg.FrontendOrigin)
	if err := srv.ListenAndServe(); err != nil {
		slog.Error("server exited", "error", err)
		os.Exit(1)
	}
}
```

Note: this won't compile until Task 5 changes `httpapi.NewRouter`'s signature — that's expected; Task 5 Step 6 finishes this wiring. Commit this task's change together with Task 5 if your workflow requires every intermediate commit to build (see Task 5 Step 6).

- [ ] **Step 2: Manually verify against the local Postgres from Task 1**

Run: `cd backend && DATABASE_URL="postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" go run ./cmd/server`
Expected (once Task 5 is also done): log line `backend listening addr=:8080 ...` and no fatal error. If Postgres isn't running, the process exits after logging `connecting to database`.

- [ ] **Step 3: Commit**

Hold this commit until Task 5 Step 6 (the router signature change) lands, so `main.go` compiles at every commit:
```bash
git add backend/cmd/server/main.go
git commit -m "feat(backend): open DB pool at startup"
```

---

## Task 5: `GET /books` handler + router wiring

**Files:**
- Create: `backend/internal/httpapi/books.go`
- Create: `backend/internal/httpapi/books_test.go`
- Modify: `backend/internal/httpapi/router.go`
- Modify: `backend/internal/httpapi/router_test.go`

**Interfaces:**
- Consumes: `store.Book` (Task 3).
- Produces: `httpapi.BooksHandler(lister bookLister) http.HandlerFunc`; `httpapi.NewRouter(cfg config.Config, books bookLister) *chi.Mux` (signature change — `books` param is new); route `GET /books`. Completes Task 4's `main.go` wiring.

- [ ] **Step 1: Write the failing handler tests**

`backend/internal/httpapi/books_test.go`:
```go
package httpapi_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/digital-library/backend/internal/httpapi"
	"github.com/digital-library/backend/internal/store"
)

type fakeBookLister struct {
	books []store.Book
	total int
	err   error

	gotLimit, gotOffset int
}

func (f *fakeBookLister) ListBooks(_ context.Context, limit, offset int) ([]store.Book, int, error) {
	f.gotLimit, f.gotOffset = limit, offset
	if f.err != nil {
		return nil, 0, f.err
	}
	return f.books, f.total, nil
}

func TestBooksHandlerReturnsBooks(t *testing.T) {
	t.Parallel()

	year := 2020
	fake := &fakeBookLister{
		books: []store.Book{{ID: 1, Title: "Dune", Author: "Frank Herbert", Year: &year}},
		total: 1,
	}

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	httpapi.BooksHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body struct {
		Books  []store.Book `json:"books"`
		Total  int          `json:"total"`
		Limit  int          `json:"limit"`
		Offset int          `json:"offset"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decoding response body: %v", err)
	}
	if len(body.Books) != 1 || body.Books[0].Title != "Dune" {
		t.Fatalf("books = %+v, want [Dune]", body.Books)
	}
	if body.Total != 1 {
		t.Fatalf("total = %d, want 1", body.Total)
	}
	if fake.gotLimit != 50 || fake.gotOffset != 0 {
		t.Fatalf("ListBooks called with limit=%d offset=%d, want 50, 0", fake.gotLimit, fake.gotOffset)
	}
}

func TestBooksHandlerParsesLimitAndOffset(t *testing.T) {
	t.Parallel()

	fake := &fakeBookLister{books: []store.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books?limit=10&offset=20", nil)
	rec := httptest.NewRecorder()

	httpapi.BooksHandler(fake).ServeHTTP(rec, req)

	if fake.gotLimit != 10 || fake.gotOffset != 20 {
		t.Fatalf("ListBooks called with limit=%d offset=%d, want 10, 20", fake.gotLimit, fake.gotOffset)
	}
}

func TestBooksHandlerReturnsEmptyList(t *testing.T) {
	t.Parallel()

	fake := &fakeBookLister{books: []store.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	httpapi.BooksHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body struct {
		Books []store.Book `json:"books"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decoding response body: %v", err)
	}
	if len(body.Books) != 0 {
		t.Fatalf("books = %+v, want empty", body.Books)
	}
}

func TestBooksHandlerReturns500OnStoreError(t *testing.T) {
	t.Parallel()

	fake := &fakeBookLister{err: errors.New("connection refused")}

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	httpapi.BooksHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/httpapi/... -run TestBooksHandler -v`
Expected: FAIL to compile — `httpapi.BooksHandler` doesn't exist yet.

- [ ] **Step 3: Implement `internal/httpapi/books.go`**

```go
package httpapi

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/digital-library/backend/internal/store"
)

const (
	defaultBooksLimit = 50
	maxBooksLimit     = 200
)

// bookLister lists a page of books. store.Store satisfies this interface.
type bookLister interface {
	ListBooks(ctx context.Context, limit, offset int) ([]store.Book, int, error)
}

type booksResponse struct {
	Books  []store.Book `json:"books"`
	Total  int          `json:"total"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}

// BooksHandler returns an http.HandlerFunc that lists books from lister,
// paginated via the "limit" and "offset" query parameters.
func BooksHandler(lister bookLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := parseLimit(r.URL.Query().Get("limit"))
		offset := parseOffset(r.URL.Query().Get("offset"))

		books, total, err := lister.ListBooks(r.Context(), limit, offset)
		if err != nil {
			slog.Error("listing books", "error", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(booksResponse{
			Books:  books,
			Total:  total,
			Limit:  limit,
			Offset: offset,
		}); err != nil {
			slog.Error("encoding books response", "error", err)
		}
	}
}

func parseLimit(raw string) int {
	if raw == "" {
		return defaultBooksLimit
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return defaultBooksLimit
	}
	if v > maxBooksLimit {
		return maxBooksLimit
	}
	return v
}

func parseOffset(raw string) int {
	if raw == "" {
		return 0
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v < 0 {
		return 0
	}
	return v
}
```

- [ ] **Step 4: Run handler tests to verify they pass**

Run: `cd backend && go test ./internal/httpapi/... -run TestBooksHandler -v`
Expected: PASS (all four tests).

- [ ] **Step 5: Update `router_test.go` for the new `NewRouter` signature (still failing — router.go not changed yet)**

In `backend/internal/httpapi/router_test.go`, change both `httpapi.NewRouter(testConfig())` calls to `httpapi.NewRouter(testConfig(), &fakeBookLister{})` (reusing the fake from `books_test.go`, same `httpapi_test` package):
```go
	r := httpapi.NewRouter(testConfig(), &fakeBookLister{})
```
(apply to both `TestRouterRecoversFromPanic` and `TestRouterAllowsConfiguredOrigin`).

Run: `cd backend && go build ./...`
Expected: FAIL — `NewRouter` doesn't accept a second argument yet.

- [ ] **Step 6: Update `router.go` and finish `main.go`'s wiring**

In `backend/internal/httpapi/router.go`, change the signature and add the route:
```go
func NewRouter(cfg config.Config, books bookLister) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(structuredLogger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{cfg.FrontendOrigin},
		AllowedMethods: []string{http.MethodGet, http.MethodOptions},
		AllowedHeaders: []string{"Accept", "Content-Type"},
		MaxAge:         maxCORSPreflightAgeSeconds,
	}))

	r.Get("/healthz", HealthzHandler)
	r.Get("/books", BooksHandler(books))

	return r
}
```

- [ ] **Step 7: Run the full backend test suite**

Run: `cd backend && go build ./... && go test ./... -v`
Expected: PASS across `config`, `httpapi`, and `store` (store tests skip without `TEST_DATABASE_URL`).

- [ ] **Step 8: Manually verify the running server (completes Task 4's verification)**

Run: `cd backend && DATABASE_URL="postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" go run ./cmd/server` then in another terminal `curl -s localhost:8080/books | head -c 300`
Expected: JSON with 8 seeded books' worth of data (or the first `limit` of them), `"total":8`.

- [ ] **Step 9: Commit (includes Task 4's `main.go` change, held until now so every commit builds)**

```bash
git add backend/internal/httpapi backend/cmd/server/main.go
git commit -m "feat(backend): add GET /books endpoint and wire DB pool"
```

---

## Task 6: `fetchBooks()` in `lib/api.ts`

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/api.test.ts`

**Interfaces:**
- Produces: `export const BOOKS_PAGE_SIZE = 50`; `export type Book = {id, title, author, year: number | null, genre: string | null, coverUrl: string | null}`; `export type BooksResult = {ok: true, books: Book[], total: number} | {ok: false, error: string}`; `fetchBooks(offset = 0, limit = BOOKS_PAGE_SIZE): Promise<BooksResult>` — consumed by Task 8 (`/books` page) and Task 9 (`BooksBrowser`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/api.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchBooks } from '@/lib/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

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

    const result = await fetchBooks();

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

    const result = await fetchBooks();

    expect(result).toEqual({ ok: true, books: [], total: 0 });
  });

  it('returns an error when the backend responds with a non-200 status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const result = await fetchBooks();

    expect(result).toEqual({ ok: false, error: 'backend responded with 500' });
  });

  it('returns an error when the network request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    const result = await fetchBooks();

    expect(result).toEqual({ ok: false, error: 'network down' });
  });

  it('requests the given offset and limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchBooks(20, 10);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/books?limit=10&offset=20'),
      expect.any(Object),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && pnpm vitest run src/lib/api.test.ts`
Expected: FAIL — `fetchBooks` is not exported.

- [ ] **Step 3: Implement `fetchBooks` in `frontend/src/lib/api.ts`**

Append to `frontend/src/lib/api.ts`:
```ts
export const BOOKS_PAGE_SIZE = 50;

export type Book = {
  id: number;
  title: string;
  author: string;
  year: number | null;
  genre: string | null;
  coverUrl: string | null;
};

export type BooksResult =
  | { ok: true; books: Book[]; total: number }
  | { ok: false; error: string };

/**
 * Fetches a page of books from the backend's /books endpoint and
 * normalizes both network failures and non-200 responses into a
 * BooksResult the UI can render without throwing.
 */
export async function fetchBooks(
  offset = 0,
  limit = BOOKS_PAGE_SIZE,
): Promise<BooksResult> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/books?limit=${limit}&offset=${offset}`,
      { cache: 'no-store', signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) {
      return { ok: false, error: `backend responded with ${res.status}` };
    }
    const body = (await res.json()) as { books: Book[]; total: number };
    return { ok: true, books: body.books, total: body.total };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && pnpm vitest run src/lib/api.test.ts`
Expected: PASS (all five tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/api.test.ts
git commit -m "feat(frontend): add fetchBooks"
```

---

## Task 7: `BookCard` component + cover image config

**Files:**
- Create: `frontend/src/components/book-card.tsx`
- Create: `frontend/src/components/book-card.test.tsx`
- Modify: `frontend/next.config.ts`

**Interfaces:**
- Consumes: `Book` type (Task 6).
- Produces: `export function BookCard({ book }: { book: Book })` — consumed by Task 9 (`BooksBrowser`).

- [ ] **Step 1: Allow the seed data's image host in `next.config.ts`**

`frontend/next.config.ts`:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Write the failing component test**

`frontend/src/components/book-card.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BookCard } from '@/components/book-card';
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

describe('BookCard', () => {
  it('renders title, author, year and genre', () => {
    render(<BookCard book={book()} />);

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('Frank Herbert')).toBeInTheDocument();
    expect(screen.getByText('1965 · Sci-Fi')).toBeInTheDocument();
  });

  it('shows a placeholder instead of an image when coverUrl is absent', () => {
    render(<BookCard book={book({ coverUrl: null })} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Нет обложки')).toBeInTheDocument();
  });

  it('renders an image when coverUrl is present', () => {
    render(
      <BookCard book={book({ coverUrl: 'https://picsum.photos/seed/dune/300/450' })} />,
    );

    expect(
      screen.getByRole('img', { name: 'Dune cover' }),
    ).toBeInTheDocument();
  });

  it('omits the year/genre line when both are absent', () => {
    render(<BookCard book={book({ year: null, genre: null })} />);

    expect(screen.queryByText('1965 · Sci-Fi')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && pnpm vitest run src/components/book-card.test.tsx`
Expected: FAIL — module `@/components/book-card` doesn't exist.

- [ ] **Step 4: Implement `BookCard`**

`frontend/src/components/book-card.tsx`:
```tsx
import Image from 'next/image';

import { Card, CardContent } from '@/components/ui/card';
import type { Book } from '@/lib/api';

export function BookCard({ book }: { book: Book }) {
  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-muted relative aspect-[2/3] w-full">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={`${book.title} cover`}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
            Нет обложки
          </div>
        )}
      </div>
      <CardContent className="space-y-1 py-3">
        <p className="truncate text-sm font-medium">{book.title}</p>
        <p className="text-muted-foreground truncate text-xs">{book.author}</p>
        {(book.year || book.genre) && (
          <p className="text-muted-foreground truncate text-xs">
            {[book.year, book.genre].filter(Boolean).join(' · ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && pnpm vitest run src/components/book-card.test.tsx`
Expected: PASS (all four tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/book-card.tsx frontend/src/components/book-card.test.tsx frontend/next.config.ts
git commit -m "feat(frontend): add BookCard component"
```

---

## Task 8: `/books` page (server-rendered first page)

**Files:**
- Create: `frontend/src/app/books/page.tsx`

**Interfaces:**
- Consumes: `fetchBooks` (Task 6), `BooksBrowser` (Task 9 — created after this task; `page.tsx` references it starting in Task 9 Step 4).

This task is written to compile once Task 9 lands (it imports `BooksBrowser`); keep them in the same commit if you want every commit to build (see Task 9 Step 6).

- [ ] **Step 1: Write `frontend/src/app/books/page.tsx`**

```tsx
import { BooksBrowser } from '@/components/books-browser';
import { BOOKS_PAGE_SIZE, fetchBooks } from '@/lib/api';

export default async function BooksPage() {
  const result = await fetchBooks(0, BOOKS_PAGE_SIZE);

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Моя библиотека</h1>
      {!result.ok ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить книги: {result.error}
        </p>
      ) : result.books.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          В библиотеке пока нет книг.
        </p>
      ) : (
        <BooksBrowser initialBooks={result.books} total={result.total} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Hold this file uncommitted until Task 9 lands `BooksBrowser`**

(No standalone commit — `pnpm build` won't succeed until `@/components/books-browser` exists. Continue directly to Task 9.)

---

## Task 9: `BooksBrowser` client component ("Load more")

**Files:**
- Create: `frontend/src/components/books-browser.tsx`
- Create: `frontend/src/components/books-browser.test.tsx`

**Interfaces:**
- Consumes: `fetchBooks`, `Book`, `BOOKS_PAGE_SIZE` (Task 6), `BookCard` (Task 7).
- Produces: `export function BooksBrowser({ initialBooks: Book[], total: number })` — consumed by Task 8's `page.tsx` (already written).

- [ ] **Step 1: Write the failing component tests**

`frontend/src/components/books-browser.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BooksBrowser } from '@/components/books-browser';
import * as api from '@/lib/api';
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

describe('BooksBrowser', () => {
  it('shows "Load more" and appends the next page when clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [book({ id: 2, title: '1984', author: 'George Orwell' })],
      total: 2,
    });

    render(<BooksBrowser initialBooks={[book()]} total={2} />);

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.queryByText('1984')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Показать ещё' }));

    await waitFor(() => expect(screen.getByText('1984')).toBeInTheDocument());
    expect(
      screen.queryByRole('button', { name: 'Показать ещё' }),
    ).not.toBeInTheDocument();
  });

  it('hides "Load more" when all books are already loaded', () => {
    render(<BooksBrowser initialBooks={[book()]} total={1} />);

    expect(
      screen.queryByRole('button', { name: 'Показать ещё' }),
    ).not.toBeInTheDocument();
  });

  it('shows an error message when loading more fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: false,
      error: 'network down',
    });

    render(<BooksBrowser initialBooks={[book()]} total={2} />);

    await user.click(screen.getByRole('button', { name: 'Показать ещё' }));

    expect(
      await screen.findByText(/Не удалось загрузить ещё книги/),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm vitest run src/components/books-browser.test.tsx`
Expected: FAIL — module `@/components/books-browser` doesn't exist.

- [ ] **Step 3: Implement `BooksBrowser`**

`frontend/src/components/books-browser.tsx`:
```tsx
'use client';

import { useState } from 'react';

import { BookCard } from '@/components/book-card';
import { Button } from '@/components/ui/button';
import { BOOKS_PAGE_SIZE, fetchBooks, type Book } from '@/lib/api';

export function BooksBrowser({
  initialBooks,
  total,
}: {
  initialBooks: Book[];
  total: number;
}) {
  const [books, setBooks] = useState(initialBooks);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    setError(null);

    const result = await fetchBooks(books.length, BOOKS_PAGE_SIZE);

    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBooks((prev) => [...prev, ...result.books]);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
      {books.length < total && (
        <Button onClick={loadMore} disabled={loading} variant="outline">
          {loading ? 'Загрузка…' : 'Показать ещё'}
        </Button>
      )}
      {error && (
        <p className="text-destructive text-sm">
          Не удалось загрузить ещё книги: {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && pnpm vitest run src/components/books-browser.test.tsx`
Expected: PASS (all three tests).

- [ ] **Step 5: Run the full frontend unit/component suite and typecheck**

Run: `cd frontend && pnpm typecheck && pnpm test`
Expected: PASS — this also compiles Task 8's `page.tsx` for the first time (it imports `BooksBrowser`, which now exists).

- [ ] **Step 6: Commit (includes Task 8's `page.tsx`, held until now so every commit builds)**

```bash
git add frontend/src/components/books-browser.tsx frontend/src/components/books-browser.test.tsx frontend/src/app/books/page.tsx
git commit -m "feat(frontend): add /books page with load-more browsing"
```

---

## Task 10: End-to-end coverage for the books page

**Files:**
- Create: `frontend/e2e/books-list.spec.ts`

**Interfaces:**
- Consumes: the running `/books` page (Task 9) against the seeded dev database (Task 1) via the existing Playwright setup (`playwright.config.ts`, same pattern as `frontend/e2e/theme-toggle.spec.ts`).

- [ ] **Step 1: Ensure the dev stack is running with seeded data**

Run: `docker ps` (Postgres from Task 1 up), `migrate -database "postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" -path backend/migrations up` (idempotent if already applied), then `make dev` in a separate terminal (leave running for this task).

- [ ] **Step 2: Write `frontend/e2e/books-list.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test.describe('books list', () => {
  test('renders seeded books from the backend', async ({ page }) => {
    await page.goto('/books');

    await expect(page.getByText('Dune')).toBeVisible();
    await expect(page.getByText('Frank Herbert')).toBeVisible();
  });

  test('shows an empty-library message when there are no books', async ({
    page,
  }) => {
    await page.route('**/books*', async (route) => {
      await route.fulfill({
        json: { books: [], total: 0, limit: 50, offset: 0 },
      });
    });

    await page.goto('/books');

    await expect(page.getByText('В библиотеке пока нет книг.')).toBeVisible();
  });

  test('shows an error message when the backend is unreachable', async ({
    page,
  }) => {
    await page.route('**/books*', async (route) => {
      await route.fulfill({ status: 500, body: '' });
    });

    await page.goto('/books');

    await expect(
      page.getByText(/Не удалось загрузить книги/),
    ).toBeVisible();
  });
});
```

- [ ] **Step 3: Run the e2e suite**

Run: `cd frontend && pnpm test:e2e -- books-list.spec.ts`
Expected: PASS (all three tests). If the first test fails because the seeded data was cleared, re-run the seed migration from Step 1.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/books-list.spec.ts
git commit -m "test(frontend): add e2e coverage for the books list page"
```

---

## Task 11: Docs and `Makefile` wiring

**Files:**
- Modify: `README.md`
- Modify: `Makefile`

**Interfaces:**
- Produces: `make migrate-up` / `make migrate-down` targets; documented `DATABASE_URL` config.

- [ ] **Step 1: Add migration targets to `Makefile`**

```makefile
.PHONY: dev backend frontend lint test test-e2e migrate-up migrate-down

migrate-up:
	migrate -database "$$DATABASE_URL" -path backend/migrations up

migrate-down:
	migrate -database "$$DATABASE_URL" -path backend/migrations down 1
```
(add `migrate-up migrate-down` to the existing `.PHONY` line rather than duplicating it; append the two new targets after `test-e2e`).

- [ ] **Step 2: Document `DATABASE_URL` and migrations in `README.md`**

In the "Configuration" section, add a line under the existing Backend bullet:
```markdown
- Backend: `PORT` (default `8080`), `FRONTEND_ORIGIN` (default
  `http://localhost:3000`, used for CORS), `DATABASE_URL` (default
  `postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable`)
```
Add a new "Database" section (after "Running locally", before "Other commands"):
```markdown
## Database

The backend needs a local Postgres instance. Start one with Docker:

\`\`\`bash
docker run --name digital-library-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=digital_library -p 5432:5432 -d postgres:16
\`\`\`

Apply migrations (requires [golang-migrate](https://github.com/golang-migrate/migrate)):

\`\`\`bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" make migrate-up
\`\`\`
```

- [ ] **Step 3: Verify the Makefile targets work**

Run: `DATABASE_URL="postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" make migrate-down` then `make migrate-up`
Expected: `books` table is dropped then recreated and reseeded without errors.

- [ ] **Step 4: Commit**

```bash
git add README.md Makefile
git commit -m "docs: document DATABASE_URL and add migrate Makefile targets"
```

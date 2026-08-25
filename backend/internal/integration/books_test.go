// Package integration_test exercises the fully composed backend — handler
// -> usecase -> repository -> a real Postgres instance — end to end, driven
// entirely through HTTP requests against the router. It is the one
// full-stack test ticket #30 calls for; each layer's own behavior is
// already covered by its own unit/integration tests (usecase, repository,
// handler).
package integration_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"github.com/digital-library/backend/internal/config"
	"github.com/digital-library/backend/internal/handler"
	"github.com/digital-library/backend/internal/repository"
	"github.com/digital-library/backend/internal/usecase"
)

// postgresImage is the image the testcontainers-provisioned Postgres
// instance runs, matching the major version used in docker-compose.yml.
const postgresImage = "postgres:18-alpine"

// schemaMigration is the single source of truth for the books table
// schema: the same file golang-migrate applies in every other environment.
var schemaMigration = filepath.Join("..", "..", "migrations", "000001_create_books.up.sql")

// dbPool is the shared connection to the testcontainers-provisioned
// Postgres instance, set up once in TestMain for every test in this
// package.
var dbPool *sql.DB

func TestMain(m *testing.M) {
	os.Exit(runTests(m))
}

// runTests provisions the Postgres container, runs the suite, and tears the
// container down. It is split out from TestMain so its deferred cleanup
// runs before the process exits: deferred calls inside TestMain itself
// never run, because os.Exit skips them.
func runTests(m *testing.M) int {
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx, postgresImage,
		postgres.WithDatabase("digital_library_test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
		postgres.WithInitScripts(schemaMigration),
		// Running an init script makes Postgres restart once (the
		// bootstrap instance applies it, then the main instance takes
		// over), so "ready to accept connections" is logged twice; waiting
		// for only the first occurrence races the restart.
		testcontainers.WithWaitStrategy(wait.ForLog("database system is ready to accept connections").WithOccurrence(2)),
	)
	if err != nil {
		fmt.Fprintln(os.Stderr, "starting postgres testcontainer:", err)
		return 1
	}
	defer func() {
		if err := testcontainers.TerminateContainer(pgContainer); err != nil {
			fmt.Fprintln(os.Stderr, "terminating postgres testcontainer:", err)
		}
	}()

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		fmt.Fprintln(os.Stderr, "getting postgres connection string:", err)
		return 1
	}

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		fmt.Fprintln(os.Stderr, "opening test database:", err)
		return 1
	}
	defer func() { _ = db.Close() }()

	dbPool = db
	return m.Run()
}

// newTestServer truncates the books table and returns an httptest.Server
// serving the fully composed router (handler -> usecase -> repository)
// against the shared testcontainers Postgres instance.
func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()

	_, err := dbPool.ExecContext(context.Background(), "TRUNCATE books RESTART IDENTITY")
	require.NoError(t, err, "truncating books table")

	books := usecase.New(repository.New(dbPool))
	cfg := config.Config{Port: "0", FrontendOrigin: "http://localhost:3000"}
	router := handler.NewRouter(cfg, books)

	srv := httptest.NewServer(router)
	t.Cleanup(srv.Close)
	return srv
}

// TestBooksFullStackCRUD drives every book operation (list, create, update,
// delete) through real HTTP requests against the composed router, verifying
// handler, usecase, and repository compose correctly end to end.
func TestBooksFullStackCRUD(t *testing.T) {
	srv := newTestServer(t)
	client := srv.Client()

	created := createBook(t, client, srv.URL, map[string]any{
		"title": "Dune", "author": "Frank Herbert", "year": 1965,
	})
	require.NotZero(t, created.ID)
	require.Equal(t, "Dune", created.Title)

	listed := listBooks(t, client, srv.URL)
	require.Equal(t, 1, listed.Total)
	require.Len(t, listed.Books, 1)
	require.Equal(t, created.ID, listed.Books[0].ID)

	updated := updateBook(t, client, srv.URL, created.ID, map[string]any{
		"title": "Dune Messiah", "author": "Frank Herbert",
	})
	require.Equal(t, created.ID, updated.ID)
	require.Equal(t, "Dune Messiah", updated.Title)

	deleteBook(t, client, srv.URL, created.ID)

	final := listBooks(t, client, srv.URL)
	require.Zero(t, final.Total)
	require.Empty(t, final.Books)
}

type bookDTO struct {
	ID     int64  `json:"id"`
	Title  string `json:"title"`
	Author string `json:"author"`
}

type booksListDTO struct {
	Books []bookDTO `json:"books"`
	Total int       `json:"total"`
}

func createBook(t *testing.T, client *http.Client, baseURL string, payload map[string]any) bookDTO {
	t.Helper()

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req, err := http.NewRequest(http.MethodPost, baseURL+"/books", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var created bookDTO
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
	return created
}

func listBooks(t *testing.T, client *http.Client, baseURL string) booksListDTO {
	t.Helper()

	resp, err := client.Get(baseURL + "/books")
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var listed booksListDTO
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&listed))
	return listed
}

func updateBook(t *testing.T, client *http.Client, baseURL string, id int64, payload map[string]any) bookDTO {
	t.Helper()

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req, err := http.NewRequest(http.MethodPatch, fmt.Sprintf("%s/books/%d", baseURL, id), bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var updated bookDTO
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&updated))
	return updated
}

func deleteBook(t *testing.T, client *http.Client, baseURL string, id int64) {
	t.Helper()

	req, err := http.NewRequest(http.MethodDelete, fmt.Sprintf("%s/books/%d", baseURL, id), nil)
	require.NoError(t, err)

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusNoContent, resp.StatusCode)
}

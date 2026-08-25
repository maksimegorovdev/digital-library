package repository_test

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"github.com/digital-library/backend/internal/domain"
	"github.com/digital-library/backend/internal/repository"
)

// postgresImage is the image the testcontainers-provisioned Postgres
// instance runs, matching the major version used in docker-compose.yml.
const postgresImage = "postgres:18-alpine"

// schemaMigration is the single source of truth for the books table
// schema: the same file golang-migrate applies in every other
// environment. Seed data (000002_seed_books.up.sql) is intentionally not
// applied here — every test truncates the table before it runs, so seed
// rows would only add container startup time.
var schemaMigration = filepath.Join("..", "..", "migrations", "000001_create_books.up.sql")

// dbPool is the shared connection to the testcontainers-provisioned
// Postgres instance, set up once in TestMain for every test in this
// package.
var dbPool *sql.DB

func TestMain(m *testing.M) {
	os.Exit(runTests(m))
}

// runTests provisions the Postgres container, runs the suite, and tears
// the container down. It is split out from TestMain so its deferred
// cleanup runs before the process exits: deferred calls inside TestMain
// itself never run, because os.Exit skips them.
func runTests(m *testing.M) int {
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx, postgresImage,
		postgres.WithDatabase("digital_library_test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
		postgres.WithInitScripts(schemaMigration),
		// Running an init script makes Postgres restart once (the
		// bootstrap instance applies it, then the main instance takes
		// over), so "ready to accept connections" is logged twice;
		// waiting for only the first occurrence races the restart.
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

// testDB returns the shared testcontainers-backed database connection,
// truncated so each test starts from an empty books table.
func testDB(t *testing.T) *sql.DB {
	t.Helper()

	_, err := dbPool.ExecContext(context.Background(), "TRUNCATE books RESTART IDENTITY")
	require.NoError(t, err, "truncating books table")

	return dbPool
}

func seedBook(t *testing.T, db *sql.DB, title, author string, year *int, genre, coverURL *string) {
	t.Helper()

	_, err := db.ExecContext(context.Background(),
		`INSERT INTO books (title, author, year, genre, cover_url) VALUES ($1, $2, $3, $4, $5)`,
		title, author, year, genre, coverURL,
	)
	require.NoError(t, err, "seeding book")
}

func intPtr(v int) *int       { return &v }
func strPtr(v string) *string { return &v }

func TestListBooksOrdersByAuthorTitleID(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	seedBook(t, db, "Book B", "Author Z", nil, nil, nil)
	seedBook(t, db, "Book A", "Author A", intPtr(2020), strPtr("Fiction"), strPtr("https://example.com/a.jpg"))

	books, total, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{})
	require.NoError(t, err)
	require.Equal(t, 2, total)
	require.Len(t, books, 2)
	require.Equal(t, "Author A", books[0].Author)
	require.Equal(t, "Author Z", books[1].Author)
	require.NotNil(t, books[0].Year)
	require.Equal(t, 2020, *books[0].Year)
	require.Nil(t, books[1].Year)
}

func TestListBooksRespectsLimitAndOffset(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	for _, author := range []string{"Author A", "Author B", "Author C"} {
		seedBook(t, db, "Title", author, nil, nil, nil)
	}

	books, total, err := r.ListBooks(context.Background(), 1, 1, domain.BookFilter{})
	require.NoError(t, err)
	require.Equal(t, 3, total)
	require.Len(t, books, 1)
	require.Equal(t, "Author B", books[0].Author)
}

func TestListBooksSearchesTitleAndAuthorCaseInsensitively(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	seedBook(t, db, "Dune", "Frank Herbert", nil, nil, nil)
	seedBook(t, db, "The Hobbit", "J.R.R. Tolkien", nil, nil, nil)
	seedBook(t, db, "Foundation", "Isaac Asimov", nil, nil, nil)

	books, total, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{Search: "hob"})
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, books, 1)
	require.Equal(t, "The Hobbit", books[0].Title)

	books, total, err = r.ListBooks(context.Background(), 10, 0, domain.BookFilter{Search: "HERBERT"})
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, books, 1)
	require.Equal(t, "Frank Herbert", books[0].Author)
}

func TestListBooksSearchTreatsPercentAndUnderscoreLiterally(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	seedBook(t, db, "100% Cotton", "A. Weaver", nil, nil, nil)
	seedBook(t, db, "Other Book", "B. Writer", nil, nil, nil)

	books, total, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{Search: "100%"})
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, books, 1)
	require.Equal(t, "100% Cotton", books[0].Title)
}

func TestListBooksSearchTrimsSurroundingWhitespace(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	seedBook(t, db, "Dune", "Frank Herbert", nil, nil, nil)

	books, total, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{Search: "  dune  "})
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, books, 1)
	require.Equal(t, "Dune", books[0].Title)
}

func TestCreateBookInsertsAndAssignsID(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	created, err := r.CreateBook(context.Background(), domain.Book{
		Title:  "Dune",
		Author: "Frank Herbert",
		Year:   intPtr(1965),
	})
	require.NoError(t, err)
	require.NotZero(t, created.ID)

	books, total, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{})
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, books, 1)
	require.Equal(t, "Dune", books[0].Title)
}

func TestListBooksFiltersByExactGenre(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	seedBook(t, db, "Book A", "Author A", nil, strPtr("Fantasy"), nil)
	seedBook(t, db, "Book B", "Author B", nil, strPtr("Fantasy Adventure"), nil)
	seedBook(t, db, "Book C", "Author C", nil, nil, nil)

	books, total, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{Genre: "Fantasy"})
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, books, 1)
	require.Equal(t, "Book A", books[0].Title)
}

func TestListBooksCombinesSearchAndGenreFilters(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	seedBook(t, db, "Dune", "Frank Herbert", nil, strPtr("Science Fiction"), nil)
	seedBook(t, db, "Dune Messiah", "Frank Herbert", nil, strPtr("Fantasy"), nil)
	seedBook(t, db, "Foundation", "Isaac Asimov", nil, strPtr("Science Fiction"), nil)

	books, total, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{Search: "dune", Genre: "Science Fiction"})
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, books, 1)
	require.Equal(t, "Dune", books[0].Title)
}

func TestListBooksEmptyFilterValuesMeanNoFilter(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	seedBook(t, db, "Book A", "Author A", nil, strPtr("Fantasy"), nil)
	seedBook(t, db, "Book B", "Author B", nil, nil, nil)

	books, total, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{Search: "", Genre: ""})
	require.NoError(t, err)
	require.Equal(t, 2, total)
	require.Len(t, books, 2)
}

func TestUpdateBookReplacesEveryColumn(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	seedBook(t, db, "Old Title", "Old Author", nil, strPtr("Fiction"), nil)
	seeded, _, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{})
	require.NoError(t, err)
	require.Len(t, seeded, 1)

	updated, err := r.UpdateBook(context.Background(), domain.Book{
		ID:     seeded[0].ID,
		Title:  "New Title",
		Author: "New Author",
		Year:   intPtr(2024),
		// Genre and CoverURL left nil: update is a full replace, so this
		// clears the genre the book was seeded with.
	})
	require.NoError(t, err)
	require.Equal(t, "New Title", updated.Title)
	require.Equal(t, "New Author", updated.Author)
	require.Nil(t, updated.Genre, "full replace should clear the seeded genre")
}

func TestUpdateBookReturnsNotFoundForUnknownID(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	_, err := r.UpdateBook(context.Background(), domain.Book{ID: 999, Title: "X", Author: "Y"})
	require.ErrorIs(t, err, domain.ErrBookNotFound)
}

func TestDeleteBookRemovesRow(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	seedBook(t, db, "Title", "Author", nil, nil, nil)
	seeded, _, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{})
	require.NoError(t, err)
	require.Len(t, seeded, 1)

	require.NoError(t, r.DeleteBook(context.Background(), seeded[0].ID))

	_, total, err := r.ListBooks(context.Background(), 10, 0, domain.BookFilter{})
	require.NoError(t, err)
	require.Zero(t, total)
}

func TestDeleteBookReturnsNotFoundForUnknownID(t *testing.T) {
	db := testDB(t)
	r := repository.New(db)

	err := r.DeleteBook(context.Background(), 999)
	require.ErrorIs(t, err, domain.ErrBookNotFound)
}

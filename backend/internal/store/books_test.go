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
	t.Cleanup(func() { _ = db.Close() })

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

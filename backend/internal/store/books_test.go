package store_test

import (
	"context"
	"database/sql"
	"errors"
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

	books, total, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{})
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

	books, total, err := s.ListBooks(context.Background(), 1, 1, store.BookFilter{})
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

func TestListBooksSearchesTitleAndAuthorCaseInsensitively(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	seedBook(t, db, "Dune", "Frank Herbert", nil, nil, nil)
	seedBook(t, db, "The Hobbit", "J.R.R. Tolkien", nil, nil, nil)
	seedBook(t, db, "Foundation", "Isaac Asimov", nil, nil, nil)

	books, total, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{Search: "hob"})
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 1 {
		t.Fatalf("total = %d, want 1", total)
	}
	if len(books) != 1 || books[0].Title != "The Hobbit" {
		t.Fatalf("books = %+v, want [The Hobbit]", books)
	}

	books, total, err = s.ListBooks(context.Background(), 10, 0, store.BookFilter{Search: "HERBERT"})
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 1 {
		t.Fatalf("total = %d, want 1", total)
	}
	if len(books) != 1 || books[0].Author != "Frank Herbert" {
		t.Fatalf("books = %+v, want [Frank Herbert]", books)
	}
}

func TestListBooksSearchTreatsPercentAndUnderscoreLiterally(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	seedBook(t, db, "100% Cotton", "A. Weaver", nil, nil, nil)
	seedBook(t, db, "Other Book", "B. Writer", nil, nil, nil)

	books, total, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{Search: "100%"})
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 1 {
		t.Fatalf("total = %d, want 1", total)
	}
	if len(books) != 1 || books[0].Title != "100% Cotton" {
		t.Fatalf("books = %+v, want [100%% Cotton]", books)
	}
}

func TestListBooksSearchTrimsSurroundingWhitespace(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	seedBook(t, db, "Dune", "Frank Herbert", nil, nil, nil)

	books, total, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{Search: "  dune  "})
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 1 {
		t.Fatalf("total = %d, want 1", total)
	}
	if len(books) != 1 || books[0].Title != "Dune" {
		t.Fatalf("books = %+v, want [Dune]", books)
	}
}

func TestCreateBookInsertsAndAssignsID(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	created, err := s.CreateBook(context.Background(), store.Book{
		Title:  "Dune",
		Author: "Frank Herbert",
		Year:   intPtr(1965),
	})
	if err != nil {
		t.Fatalf("CreateBook() error = %v", err)
	}
	if created.ID == 0 {
		t.Fatalf("CreateBook() did not assign an ID")
	}

	books, total, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{})
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 1 || len(books) != 1 || books[0].Title != "Dune" {
		t.Fatalf("books = %+v, want [Dune]", books)
	}
}

func TestListBooksFiltersByExactGenre(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	seedBook(t, db, "Book A", "Author A", nil, strPtr("Fantasy"), nil)
	seedBook(t, db, "Book B", "Author B", nil, strPtr("Fantasy Adventure"), nil)
	seedBook(t, db, "Book C", "Author C", nil, nil, nil)

	books, total, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{Genre: "Fantasy"})
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 1 {
		t.Fatalf("total = %d, want 1", total)
	}
	if len(books) != 1 || books[0].Title != "Book A" {
		t.Fatalf("books = %+v, want [Book A]", books)
	}
}

func TestListBooksCombinesSearchAndGenreFilters(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	seedBook(t, db, "Dune", "Frank Herbert", nil, strPtr("Science Fiction"), nil)
	seedBook(t, db, "Dune Messiah", "Frank Herbert", nil, strPtr("Fantasy"), nil)
	seedBook(t, db, "Foundation", "Isaac Asimov", nil, strPtr("Science Fiction"), nil)

	books, total, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{Search: "dune", Genre: "Science Fiction"})
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 1 {
		t.Fatalf("total = %d, want 1", total)
	}
	if len(books) != 1 || books[0].Title != "Dune" {
		t.Fatalf("books = %+v, want [Dune]", books)
	}
}

func TestListBooksEmptyFilterValuesMeanNoFilter(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	seedBook(t, db, "Book A", "Author A", nil, strPtr("Fantasy"), nil)
	seedBook(t, db, "Book B", "Author B", nil, nil, nil)

	books, total, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{Search: "", Genre: ""})
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 2 || len(books) != 2 {
		t.Fatalf("books = %+v, total = %d, want 2 unfiltered books", books, total)
	}
}

func TestUpdateBookReplacesEveryColumn(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	seedBook(t, db, "Old Title", "Old Author", nil, strPtr("Fiction"), nil)
	seeded, _, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{})
	if err != nil || len(seeded) != 1 {
		t.Fatalf("seeding failed: books=%+v err=%v", seeded, err)
	}

	updated, err := s.UpdateBook(context.Background(), store.Book{
		ID:     seeded[0].ID,
		Title:  "New Title",
		Author: "New Author",
		Year:   intPtr(2024),
		// Genre and CoverURL left nil: update is a full replace, so this
		// clears the genre the book was seeded with.
	})
	if err != nil {
		t.Fatalf("UpdateBook() error = %v", err)
	}
	if updated.Title != "New Title" || updated.Author != "New Author" {
		t.Fatalf("UpdateBook() = %+v, want New Title/New Author", updated)
	}
	if updated.Genre != nil {
		t.Fatalf("UpdateBook() Genre = %v, want nil (full replace clears it)", *updated.Genre)
	}
}

func TestUpdateBookReturnsNotFoundForUnknownID(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	_, err := s.UpdateBook(context.Background(), store.Book{ID: 999, Title: "X", Author: "Y"})
	if !errors.Is(err, store.ErrBookNotFound) {
		t.Fatalf("UpdateBook() error = %v, want ErrBookNotFound", err)
	}
}

func TestDeleteBookRemovesRow(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	seedBook(t, db, "Title", "Author", nil, nil, nil)
	seeded, _, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{})
	if err != nil || len(seeded) != 1 {
		t.Fatalf("seeding failed: books=%+v err=%v", seeded, err)
	}

	if err := s.DeleteBook(context.Background(), seeded[0].ID); err != nil {
		t.Fatalf("DeleteBook() error = %v", err)
	}

	_, total, err := s.ListBooks(context.Background(), 10, 0, store.BookFilter{})
	if err != nil {
		t.Fatalf("ListBooks() error = %v", err)
	}
	if total != 0 {
		t.Fatalf("total = %d, want 0 after delete", total)
	}
}

func TestDeleteBookReturnsNotFoundForUnknownID(t *testing.T) {
	db := testDB(t)
	s := store.New(db)

	if err := s.DeleteBook(context.Background(), 999); !errors.Is(err, store.ErrBookNotFound) {
		t.Fatalf("DeleteBook() error = %v, want ErrBookNotFound", err)
	}
}

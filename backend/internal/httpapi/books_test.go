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
	gotFilter           store.BookFilter
}

func (f *fakeBookLister) ListBooks(_ context.Context, limit, offset int, filter store.BookFilter) ([]store.Book, int, error) {
	f.gotLimit, f.gotOffset = limit, offset
	f.gotFilter = filter
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

func TestBooksHandlerParsesSearchAndGenre(t *testing.T) {
	t.Parallel()

	fake := &fakeBookLister{books: []store.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books?search=dune&genre=Fantasy", nil)
	rec := httptest.NewRecorder()

	httpapi.BooksHandler(fake).ServeHTTP(rec, req)

	want := store.BookFilter{Search: "dune", Genre: "Fantasy"}
	if fake.gotFilter != want {
		t.Fatalf("ListBooks called with filter=%+v, want %+v", fake.gotFilter, want)
	}
}

func TestBooksHandlerTreatsMissingSearchAndGenreAsNoFilter(t *testing.T) {
	t.Parallel()

	fake := &fakeBookLister{books: []store.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	httpapi.BooksHandler(fake).ServeHTTP(rec, req)

	want := store.BookFilter{}
	if fake.gotFilter != want {
		t.Fatalf("ListBooks called with filter=%+v, want %+v", fake.gotFilter, want)
	}
}

func TestBooksHandlerTreatsEmptySearchAndGenreAsNoFilter(t *testing.T) {
	t.Parallel()

	fake := &fakeBookLister{books: []store.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books?search=&genre=", nil)
	rec := httptest.NewRecorder()

	httpapi.BooksHandler(fake).ServeHTTP(rec, req)

	want := store.BookFilter{}
	if fake.gotFilter != want {
		t.Fatalf("ListBooks called with filter=%+v, want %+v", fake.gotFilter, want)
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

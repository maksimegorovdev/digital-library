package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/digital-library/backend/internal/httpapi"
	"github.com/digital-library/backend/internal/store"
)

// fakeBookStore fakes every persistence method the books routes depend on.
type fakeBookStore struct {
	books []store.Book
	total int
	err   error

	gotLimit, gotOffset int
	gotFilter           store.BookFilter

	createResult store.Book
	createErr    error
	gotCreate    store.Book

	updateResult store.Book
	updateErr    error
	gotUpdate    store.Book

	deleteErr error
	gotDelete int64
}

func (f *fakeBookStore) ListBooks(_ context.Context, limit, offset int, filter store.BookFilter) ([]store.Book, int, error) {
	f.gotLimit, f.gotOffset = limit, offset
	f.gotFilter = filter
	if f.err != nil {
		return nil, 0, f.err
	}
	return f.books, f.total, nil
}

func (f *fakeBookStore) CreateBook(_ context.Context, b store.Book) (store.Book, error) {
	f.gotCreate = b
	if f.createErr != nil {
		return store.Book{}, f.createErr
	}
	return f.createResult, nil
}

func (f *fakeBookStore) UpdateBook(_ context.Context, b store.Book) (store.Book, error) {
	f.gotUpdate = b
	if f.updateErr != nil {
		return store.Book{}, f.updateErr
	}
	return f.updateResult, nil
}

func (f *fakeBookStore) DeleteBook(_ context.Context, id int64) error {
	f.gotDelete = id
	return f.deleteErr
}

// requestWithID builds a request carrying a chi "id" URL parameter, as if
// it had been routed through a chi.Mux matching "/books/{id}".
func requestWithID(method, target, id string, body []byte) *http.Request {
	req := httptest.NewRequest(method, target, bytes.NewReader(body))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id)
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
}

func TestBooksHandlerReturnsBooks(t *testing.T) {
	t.Parallel()

	year := 2020
	fake := &fakeBookStore{
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

	fake := &fakeBookStore{books: []store.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books?limit=10&offset=20", nil)
	rec := httptest.NewRecorder()

	httpapi.BooksHandler(fake).ServeHTTP(rec, req)

	if fake.gotLimit != 10 || fake.gotOffset != 20 {
		t.Fatalf("ListBooks called with limit=%d offset=%d, want 10, 20", fake.gotLimit, fake.gotOffset)
	}
}

func TestBooksHandlerReturnsEmptyList(t *testing.T) {
	t.Parallel()

	fake := &fakeBookStore{books: []store.Book{}, total: 0}

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

	fake := &fakeBookStore{books: []store.Book{}, total: 0}

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

	fake := &fakeBookStore{books: []store.Book{}, total: 0}

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

	fake := &fakeBookStore{books: []store.Book{}, total: 0}

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

	fake := &fakeBookStore{err: errors.New("connection refused")}

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	httpapi.BooksHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func TestCreateBookHandlerCreatesBook(t *testing.T) {
	t.Parallel()

	year := 1965
	fake := &fakeBookStore{
		createResult: store.Book{ID: 1, Title: "Dune", Author: "Frank Herbert", Year: &year},
	}

	body, _ := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert", "year": 1965})
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	httpapi.CreateBookHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusCreated)
	}
	if fake.gotCreate.Title != "Dune" || fake.gotCreate.Author != "Frank Herbert" {
		t.Fatalf("CreateBook called with %+v, want title/author set", fake.gotCreate)
	}

	var created store.Book
	if err := json.NewDecoder(rec.Body).Decode(&created); err != nil {
		t.Fatalf("decoding response body: %v", err)
	}
	if created.ID != 1 {
		t.Fatalf("created.ID = %d, want 1", created.ID)
	}
}

func TestCreateBookHandlerRejectsMissingTitle(t *testing.T) {
	t.Parallel()

	fake := &fakeBookStore{}

	body, _ := json.Marshal(map[string]any{"title": "  ", "author": "Frank Herbert"})
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	httpapi.CreateBookHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
	if fake.gotCreate != (store.Book{}) {
		t.Fatalf("CreateBook should not have been called, got %+v", fake.gotCreate)
	}
}

func TestCreateBookHandlerRejectsMissingAuthor(t *testing.T) {
	t.Parallel()

	fake := &fakeBookStore{}

	body, _ := json.Marshal(map[string]any{"title": "Dune", "author": ""})
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	httpapi.CreateBookHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestCreateBookHandlerReturns500OnStoreError(t *testing.T) {
	t.Parallel()

	fake := &fakeBookStore{createErr: errors.New("connection refused")}

	body, _ := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	httpapi.CreateBookHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func TestUpdateBookHandlerUpdatesBook(t *testing.T) {
	t.Parallel()

	fake := &fakeBookStore{
		updateResult: store.Book{ID: 5, Title: "Dune", Author: "Frank Herbert"},
	}

	body, _ := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	req := requestWithID(http.MethodPatch, "/books/5", "5", body)
	rec := httptest.NewRecorder()

	httpapi.UpdateBookHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if fake.gotUpdate.ID != 5 {
		t.Fatalf("UpdateBook called with ID=%d, want 5", fake.gotUpdate.ID)
	}
}

func TestUpdateBookHandlerRejectsInvalidID(t *testing.T) {
	t.Parallel()

	fake := &fakeBookStore{}

	body, _ := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	req := requestWithID(http.MethodPatch, "/books/abc", "abc", body)
	rec := httptest.NewRecorder()

	httpapi.UpdateBookHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestUpdateBookHandlerReturns404WhenNotFound(t *testing.T) {
	t.Parallel()

	fake := &fakeBookStore{updateErr: store.ErrBookNotFound}

	body, _ := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	req := requestWithID(http.MethodPatch, "/books/999", "999", body)
	rec := httptest.NewRecorder()

	httpapi.UpdateBookHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestDeleteBookHandlerDeletesBook(t *testing.T) {
	t.Parallel()

	fake := &fakeBookStore{}

	req := requestWithID(http.MethodDelete, "/books/5", "5", nil)
	rec := httptest.NewRecorder()

	httpapi.DeleteBookHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	if fake.gotDelete != 5 {
		t.Fatalf("DeleteBook called with id=%d, want 5", fake.gotDelete)
	}
}

func TestDeleteBookHandlerReturns404WhenNotFound(t *testing.T) {
	t.Parallel()

	fake := &fakeBookStore{deleteErr: store.ErrBookNotFound}

	req := requestWithID(http.MethodDelete, "/books/999", "999", nil)
	rec := httptest.NewRecorder()

	httpapi.DeleteBookHandler(fake).ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

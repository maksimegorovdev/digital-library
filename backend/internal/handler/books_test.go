package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/require"

	"github.com/digital-library/backend/internal/domain"
	"github.com/digital-library/backend/internal/handler"
	"github.com/digital-library/backend/internal/usecase"
)

// fakeBookUsecase fakes every usecase method the books routes depend on.
type fakeBookUsecase struct {
	books []domain.Book
	total int
	err   error

	gotLimit, gotOffset int
	gotFilter           domain.BookFilter

	createResult domain.Book
	createErr    error
	gotCreate    domain.Book

	updateResult domain.Book
	updateErr    error
	gotUpdateID  int64
	gotUpdate    domain.Book

	deleteErr error
	gotDelete int64
}

func (f *fakeBookUsecase) ListBooks(_ context.Context, limit, offset int, filter domain.BookFilter) ([]domain.Book, int, error) {
	f.gotLimit, f.gotOffset = limit, offset
	f.gotFilter = filter
	if f.err != nil {
		return nil, 0, f.err
	}
	return f.books, f.total, nil
}

func (f *fakeBookUsecase) CreateBook(_ context.Context, b domain.Book) (domain.Book, error) {
	f.gotCreate = b
	if f.createErr != nil {
		return domain.Book{}, f.createErr
	}
	return f.createResult, nil
}

func (f *fakeBookUsecase) UpdateBook(_ context.Context, id int64, b domain.Book) (domain.Book, error) {
	f.gotUpdateID = id
	f.gotUpdate = b
	if f.updateErr != nil {
		return domain.Book{}, f.updateErr
	}
	return f.updateResult, nil
}

func (f *fakeBookUsecase) DeleteBook(_ context.Context, id int64) error {
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
	fake := &fakeBookUsecase{
		books: []domain.Book{{ID: 1, Title: "Dune", Author: "Frank Herbert", Year: &year}},
		total: 1,
	}

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var body struct {
		Books []struct {
			Title string `json:"title"`
		} `json:"books"`
		Total  int `json:"total"`
		Limit  int `json:"limit"`
		Offset int `json:"offset"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	require.Len(t, body.Books, 1)
	require.Equal(t, "Dune", body.Books[0].Title)
	require.Equal(t, 1, body.Total)
	require.Equal(t, 50, fake.gotLimit)
	require.Equal(t, 0, fake.gotOffset)
}

func TestBooksHandlerParsesLimitAndOffset(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{books: []domain.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books?limit=10&offset=20", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, 10, fake.gotLimit)
	require.Equal(t, 20, fake.gotOffset)
}

func TestBooksHandlerReturnsEmptyList(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{books: []domain.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var body struct {
		Books []domain.Book `json:"books"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	require.Empty(t, body.Books)
}

func TestBooksHandlerParsesSearchAndGenre(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{books: []domain.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books?search=dune&genre=Fantasy", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, domain.BookFilter{Search: "dune", Genre: "Fantasy"}, fake.gotFilter)
}

func TestBooksHandlerTreatsMissingSearchAndGenreAsNoFilter(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{books: []domain.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, domain.BookFilter{}, fake.gotFilter)
}

func TestBooksHandlerTreatsEmptySearchAndGenreAsNoFilter(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{books: []domain.Book{}, total: 0}

	req := httptest.NewRequest(http.MethodGet, "/books?search=&genre=", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, domain.BookFilter{}, fake.gotFilter)
}

func TestBooksHandlerReturns500OnUsecaseError(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{err: errors.New("connection refused")}

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusInternalServerError, rec.Code)
}

func TestCreateBookHandlerCreatesBook(t *testing.T) {
	t.Parallel()

	year := 1965
	fake := &fakeBookUsecase{
		createResult: domain.Book{ID: 1, Title: "Dune", Author: "Frank Herbert", Year: &year},
	}

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert", "year": 1965})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusCreated, rec.Code)
	require.Equal(t, "Dune", fake.gotCreate.Title)
	require.Equal(t, "Frank Herbert", fake.gotCreate.Author)

	var created struct {
		ID int64 `json:"id"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&created))
	require.Equal(t, int64(1), created.ID)
}

func TestCreateBookHandlerRejectsInvalidBody(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{}

	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader([]byte("not json")))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Equal(t, domain.Book{}, fake.gotCreate)
}

func TestCreateBookHandlerRejectsMissingTitle(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{createErr: usecase.ErrTitleRequired}

	body, err := json.Marshal(map[string]any{"title": "  ", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestCreateBookHandlerRejectsMissingAuthor(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{createErr: usecase.ErrAuthorRequired}

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": ""})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestCreateBookHandlerReturns500OnUsecaseError(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{createErr: errors.New("connection refused")}

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusInternalServerError, rec.Code)
}

func TestUpdateBookHandlerUpdatesBook(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{
		updateResult: domain.Book{ID: 5, Title: "Dune", Author: "Frank Herbert"},
	}

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := requestWithID(http.MethodPatch, "/books/5", "5", body)
	rec := httptest.NewRecorder()

	handler.UpdateBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, int64(5), fake.gotUpdateID)
}

func TestUpdateBookHandlerRejectsInvalidID(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{}

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := requestWithID(http.MethodPatch, "/books/abc", "abc", body)
	rec := httptest.NewRecorder()

	handler.UpdateBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestUpdateBookHandlerRejectsMissingTitle(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{updateErr: usecase.ErrTitleRequired}

	body, err := json.Marshal(map[string]any{"title": "  ", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := requestWithID(http.MethodPatch, "/books/5", "5", body)
	rec := httptest.NewRecorder()

	handler.UpdateBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestUpdateBookHandlerReturns404WhenNotFound(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{updateErr: domain.ErrBookNotFound}

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := requestWithID(http.MethodPatch, "/books/999", "999", body)
	rec := httptest.NewRecorder()

	handler.UpdateBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusNotFound, rec.Code)
}

func TestDeleteBookHandlerDeletesBook(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{}

	req := requestWithID(http.MethodDelete, "/books/5", "5", nil)
	rec := httptest.NewRecorder()

	handler.DeleteBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusNoContent, rec.Code)
	require.Equal(t, int64(5), fake.gotDelete)
}

func TestDeleteBookHandlerReturns404WhenNotFound(t *testing.T) {
	t.Parallel()

	fake := &fakeBookUsecase{deleteErr: domain.ErrBookNotFound}

	req := requestWithID(http.MethodDelete, "/books/999", "999", nil)
	rec := httptest.NewRecorder()

	handler.DeleteBookHandler(fake).ServeHTTP(rec, req)

	require.Equal(t, http.StatusNotFound, rec.Code)
}

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
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/digital-library/backend/internal/domain"
	"github.com/digital-library/backend/internal/handler"
	"github.com/digital-library/backend/internal/usecase"
)

// mockBookUsecase mocks the handler's bookLister/bookCreator/bookUpdater/
// bookDeleter interfaces via testify/mock, consistent with
// usecase/book_test.go's mockBookRepository.
type mockBookUsecase struct {
	mock.Mock
}

func (m *mockBookUsecase) ListBooks(ctx context.Context, limit, offset int, filter domain.BookFilter) ([]domain.Book, int, error) {
	args := m.Called(ctx, limit, offset, filter)
	books, _ := args.Get(0).([]domain.Book)
	return books, args.Int(1), args.Error(2)
}

func (m *mockBookUsecase) CreateBook(ctx context.Context, b domain.Book) (domain.Book, error) {
	args := m.Called(ctx, b)
	book, _ := args.Get(0).(domain.Book)
	return book, args.Error(1)
}

func (m *mockBookUsecase) UpdateBook(ctx context.Context, id int64, b domain.Book) (domain.Book, error) {
	args := m.Called(ctx, id, b)
	book, _ := args.Get(0).(domain.Book)
	return book, args.Error(1)
}

func (m *mockBookUsecase) DeleteBook(ctx context.Context, id int64) error {
	args := m.Called(ctx, id)
	return args.Error(0)
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
	mockUC := new(mockBookUsecase)
	books := []domain.Book{{ID: 1, Title: "Dune", Author: "Frank Herbert", Year: &year}}
	mockUC.On("ListBooks", mock.Anything, 50, 0, domain.BookFilter{}).Return(books, 1, nil)

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(mockUC).ServeHTTP(rec, req)

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
	mockUC.AssertExpectations(t)
}

func TestBooksHandlerParsesLimitAndOffset(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("ListBooks", mock.Anything, 10, 20, domain.BookFilter{}).Return([]domain.Book{}, 0, nil)

	req := httptest.NewRequest(http.MethodGet, "/books?limit=10&offset=20", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(mockUC).ServeHTTP(rec, req)

	mockUC.AssertExpectations(t)
}

func TestBooksHandlerReturnsEmptyList(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("ListBooks", mock.Anything, 50, 0, domain.BookFilter{}).Return([]domain.Book{}, 0, nil)

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var body struct {
		Books []domain.Book `json:"books"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	require.Empty(t, body.Books)
}

func TestBooksHandlerParsesSearchAndGenre(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("ListBooks", mock.Anything, 50, 0, domain.BookFilter{Search: "dune", Genre: "Fantasy"}).
		Return([]domain.Book{}, 0, nil)

	req := httptest.NewRequest(http.MethodGet, "/books?search=dune&genre=Fantasy", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(mockUC).ServeHTTP(rec, req)

	mockUC.AssertExpectations(t)
}

func TestBooksHandlerTreatsMissingSearchAndGenreAsNoFilter(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("ListBooks", mock.Anything, 50, 0, domain.BookFilter{}).Return([]domain.Book{}, 0, nil)

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(mockUC).ServeHTTP(rec, req)

	mockUC.AssertExpectations(t)
}

func TestBooksHandlerTreatsEmptySearchAndGenreAsNoFilter(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("ListBooks", mock.Anything, 50, 0, domain.BookFilter{}).Return([]domain.Book{}, 0, nil)

	req := httptest.NewRequest(http.MethodGet, "/books?search=&genre=", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(mockUC).ServeHTTP(rec, req)

	mockUC.AssertExpectations(t)
}

func TestBooksHandlerReturns500OnUsecaseError(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("ListBooks", mock.Anything, 50, 0, domain.BookFilter{}).
		Return([]domain.Book(nil), 0, errors.New("connection refused"))

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	rec := httptest.NewRecorder()

	handler.BooksHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusInternalServerError, rec.Code)
}

func TestCreateBookHandlerCreatesBook(t *testing.T) {
	t.Parallel()

	year := 1965
	mockUC := new(mockBookUsecase)
	mockUC.On("CreateBook", mock.Anything, domain.Book{Title: "Dune", Author: "Frank Herbert", Year: &year}).
		Return(domain.Book{ID: 1, Title: "Dune", Author: "Frank Herbert", Year: &year}, nil)

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert", "year": 1965})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusCreated, rec.Code)

	var created struct {
		ID int64 `json:"id"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&created))
	require.Equal(t, int64(1), created.ID)
	mockUC.AssertExpectations(t)
}

func TestCreateBookHandlerRejectsInvalidBody(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)

	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader([]byte("not json")))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
	mockUC.AssertNotCalled(t, "CreateBook", mock.Anything, mock.Anything)
}

func TestCreateBookHandlerRejectsMissingTitle(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("CreateBook", mock.Anything, mock.Anything).Return(domain.Book{}, usecase.ErrTitleRequired)

	body, err := json.Marshal(map[string]any{"title": "  ", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestCreateBookHandlerRejectsMissingAuthor(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("CreateBook", mock.Anything, mock.Anything).Return(domain.Book{}, usecase.ErrAuthorRequired)

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": ""})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestCreateBookHandlerReturns500OnUsecaseError(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("CreateBook", mock.Anything, mock.Anything).Return(domain.Book{}, errors.New("connection refused"))

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handler.CreateBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusInternalServerError, rec.Code)
}

func TestUpdateBookHandlerUpdatesBook(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("UpdateBook", mock.Anything, int64(5), domain.Book{Title: "Dune", Author: "Frank Herbert"}).
		Return(domain.Book{ID: 5, Title: "Dune", Author: "Frank Herbert"}, nil)

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := requestWithID(http.MethodPatch, "/books/5", "5", body)
	rec := httptest.NewRecorder()

	handler.UpdateBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	mockUC.AssertExpectations(t)
}

func TestUpdateBookHandlerRejectsInvalidID(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := requestWithID(http.MethodPatch, "/books/abc", "abc", body)
	rec := httptest.NewRecorder()

	handler.UpdateBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
	mockUC.AssertNotCalled(t, "UpdateBook", mock.Anything, mock.Anything, mock.Anything)
}

func TestUpdateBookHandlerRejectsMissingTitle(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("UpdateBook", mock.Anything, int64(5), mock.Anything).Return(domain.Book{}, usecase.ErrTitleRequired)

	body, err := json.Marshal(map[string]any{"title": "  ", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := requestWithID(http.MethodPatch, "/books/5", "5", body)
	rec := httptest.NewRecorder()

	handler.UpdateBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestUpdateBookHandlerReturns404WhenNotFound(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("UpdateBook", mock.Anything, int64(999), mock.Anything).Return(domain.Book{}, domain.ErrBookNotFound)

	body, err := json.Marshal(map[string]any{"title": "Dune", "author": "Frank Herbert"})
	require.NoError(t, err)
	req := requestWithID(http.MethodPatch, "/books/999", "999", body)
	rec := httptest.NewRecorder()

	handler.UpdateBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusNotFound, rec.Code)
}

func TestDeleteBookHandlerDeletesBook(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("DeleteBook", mock.Anything, int64(5)).Return(nil)

	req := requestWithID(http.MethodDelete, "/books/5", "5", nil)
	rec := httptest.NewRecorder()

	handler.DeleteBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusNoContent, rec.Code)
	mockUC.AssertExpectations(t)
}

func TestDeleteBookHandlerReturns404WhenNotFound(t *testing.T) {
	t.Parallel()

	mockUC := new(mockBookUsecase)
	mockUC.On("DeleteBook", mock.Anything, int64(999)).Return(domain.ErrBookNotFound)

	req := requestWithID(http.MethodDelete, "/books/999", "999", nil)
	rec := httptest.NewRecorder()

	handler.DeleteBookHandler(mockUC).ServeHTTP(rec, req)

	require.Equal(t, http.StatusNotFound, rec.Code)
}

package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/digital-library/backend/internal/domain"
	"github.com/digital-library/backend/internal/usecase"
)

// mockBookRepository mocks domain.BookRepository via testify/mock, so
// usecase.Books can be tested without a real database.
type mockBookRepository struct {
	mock.Mock
}

var _ domain.BookRepository = (*mockBookRepository)(nil)

func (m *mockBookRepository) ListBooks(ctx context.Context, limit, offset int, filter domain.BookFilter) ([]domain.Book, int, error) {
	args := m.Called(ctx, limit, offset, filter)
	books, _ := args.Get(0).([]domain.Book)
	return books, args.Int(1), args.Error(2)
}

func (m *mockBookRepository) CreateBook(ctx context.Context, b domain.Book) (domain.Book, error) {
	args := m.Called(ctx, b)
	book, _ := args.Get(0).(domain.Book)
	return book, args.Error(1)
}

func (m *mockBookRepository) UpdateBook(ctx context.Context, b domain.Book) (domain.Book, error) {
	args := m.Called(ctx, b)
	book, _ := args.Get(0).(domain.Book)
	return book, args.Error(1)
}

func (m *mockBookRepository) DeleteBook(ctx context.Context, id int64) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func TestBooksListBooksPassesThroughToRepository(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)
	filter := domain.BookFilter{Search: "dune"}
	want := []domain.Book{{ID: 1, Title: "Dune"}}
	repo.On("ListBooks", mock.Anything, 10, 5, filter).Return(want, 1, nil)

	books := usecase.New(repo)
	got, total, err := books.ListBooks(context.Background(), 10, 5, filter)

	require.NoError(t, err)
	require.Equal(t, want, got)
	require.Equal(t, 1, total)
	repo.AssertExpectations(t)
}

func TestBooksListBooksReturnsRepositoryError(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)
	repo.On("ListBooks", mock.Anything, 10, 0, domain.BookFilter{}).
		Return([]domain.Book(nil), 0, errors.New("connection refused"))

	books := usecase.New(repo)
	_, _, err := books.ListBooks(context.Background(), 10, 0, domain.BookFilter{})

	require.Error(t, err)
}

func TestBooksCreateBookTrimsTitleAndAuthor(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)
	want := domain.Book{Title: "Dune", Author: "Frank Herbert"}
	repo.On("CreateBook", mock.Anything, want).
		Return(domain.Book{ID: 1, Title: "Dune", Author: "Frank Herbert"}, nil)

	books := usecase.New(repo)
	created, err := books.CreateBook(context.Background(), domain.Book{Title: "  Dune  ", Author: "  Frank Herbert  "})

	require.NoError(t, err)
	require.Equal(t, int64(1), created.ID)
	repo.AssertExpectations(t)
}

func TestBooksCreateBookRejectsEmptyTitle(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)

	books := usecase.New(repo)
	_, err := books.CreateBook(context.Background(), domain.Book{Title: "   ", Author: "Frank Herbert"})

	require.ErrorIs(t, err, usecase.ErrTitleRequired)
	repo.AssertNotCalled(t, "CreateBook", mock.Anything, mock.Anything)
}

func TestBooksCreateBookRejectsEmptyAuthor(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)

	books := usecase.New(repo)
	_, err := books.CreateBook(context.Background(), domain.Book{Title: "Dune", Author: "   "})

	require.ErrorIs(t, err, usecase.ErrAuthorRequired)
	repo.AssertNotCalled(t, "CreateBook", mock.Anything, mock.Anything)
}

func TestBooksCreateBookReturnsRepositoryError(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)
	repo.On("CreateBook", mock.Anything, mock.Anything).Return(domain.Book{}, errors.New("connection refused"))

	books := usecase.New(repo)
	_, err := books.CreateBook(context.Background(), domain.Book{Title: "Dune", Author: "Frank Herbert"})

	require.Error(t, err)
	require.NotErrorIs(t, err, usecase.ErrTitleRequired)
	require.NotErrorIs(t, err, usecase.ErrAuthorRequired)
}

func TestBooksUpdateBookSetsIDAndTrims(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)
	want := domain.Book{ID: 5, Title: "Dune", Author: "Frank Herbert"}
	repo.On("UpdateBook", mock.Anything, want).Return(want, nil)

	books := usecase.New(repo)
	updated, err := books.UpdateBook(context.Background(), 5, domain.Book{Title: " Dune ", Author: " Frank Herbert "})

	require.NoError(t, err)
	require.Equal(t, want, updated)
	repo.AssertExpectations(t)
}

func TestBooksUpdateBookRejectsEmptyTitle(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)

	books := usecase.New(repo)
	_, err := books.UpdateBook(context.Background(), 5, domain.Book{Title: "", Author: "Frank Herbert"})

	require.ErrorIs(t, err, usecase.ErrTitleRequired)
	repo.AssertNotCalled(t, "UpdateBook", mock.Anything, mock.Anything)
}

func TestBooksUpdateBookRejectsEmptyAuthor(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)

	books := usecase.New(repo)
	_, err := books.UpdateBook(context.Background(), 5, domain.Book{Title: "Dune", Author: ""})

	require.ErrorIs(t, err, usecase.ErrAuthorRequired)
	repo.AssertNotCalled(t, "UpdateBook", mock.Anything, mock.Anything)
}

func TestBooksUpdateBookReturnsNotFound(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)
	repo.On("UpdateBook", mock.Anything, mock.Anything).Return(domain.Book{}, domain.ErrBookNotFound)

	books := usecase.New(repo)
	_, err := books.UpdateBook(context.Background(), 999, domain.Book{Title: "Dune", Author: "Frank Herbert"})

	require.ErrorIs(t, err, domain.ErrBookNotFound)
}

func TestBooksDeleteBookDelegatesToRepository(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)
	repo.On("DeleteBook", mock.Anything, int64(5)).Return(nil)

	books := usecase.New(repo)
	err := books.DeleteBook(context.Background(), 5)

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestBooksDeleteBookReturnsNotFound(t *testing.T) {
	t.Parallel()

	repo := new(mockBookRepository)
	repo.On("DeleteBook", mock.Anything, int64(999)).Return(domain.ErrBookNotFound)

	books := usecase.New(repo)
	err := books.DeleteBook(context.Background(), 999)

	require.ErrorIs(t, err, domain.ErrBookNotFound)
}

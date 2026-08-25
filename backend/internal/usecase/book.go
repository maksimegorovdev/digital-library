// Package usecase implements the backend's book-related business logic —
// listing, creation, updates, and deletion — against the
// domain.BookRepository contract. It depends only on domain: no HTTP or SQL
// types leak into this package. handler depends on usecase's exported
// operations; repository satisfies the domain.BookRepository dependency
// injected here. See ADR 0004 for the full layering this package anchors.
package usecase

import (
	"context"
	"errors"
	"strings"

	"github.com/digital-library/backend/internal/domain"
)

// ErrTitleRequired indicates a book was submitted with an empty (or
// all-whitespace) title.
var ErrTitleRequired = errors.New("usecase: title is required")

// ErrAuthorRequired indicates a book was submitted with an empty (or
// all-whitespace) author.
var ErrAuthorRequired = errors.New("usecase: author is required")

// Books implements the book-related business logic — validation and
// orchestration — against a domain.BookRepository.
type Books struct {
	repo domain.BookRepository
}

// New returns a Books usecase backed by repo.
func New(repo domain.BookRepository) *Books {
	return &Books{repo: repo}
}

// ListBooks returns a page of books matching filter. limit and offset are
// passed through to the repository unchanged: parsing and defaulting raw
// query-parameter values is a transport concern owned by handler.
func (b *Books) ListBooks(ctx context.Context, limit, offset int, filter domain.BookFilter) ([]domain.Book, int, error) {
	return b.repo.ListBooks(ctx, limit, offset, filter)
}

// CreateBook validates and creates book. Title and Author are trimmed of
// surrounding whitespace; ErrTitleRequired or ErrAuthorRequired is returned
// if either is empty after trimming.
func (b *Books) CreateBook(ctx context.Context, book domain.Book) (domain.Book, error) {
	validated, err := validateBook(book)
	if err != nil {
		return domain.Book{}, err
	}
	return b.repo.CreateBook(ctx, validated)
}

// UpdateBook validates book and replaces every column of the book
// identified by id with it. Title and Author are trimmed of surrounding
// whitespace; ErrTitleRequired or ErrAuthorRequired is returned if either is
// empty after trimming. Returns domain.ErrBookNotFound if no book has that
// id.
func (b *Books) UpdateBook(ctx context.Context, id int64, book domain.Book) (domain.Book, error) {
	validated, err := validateBook(book)
	if err != nil {
		return domain.Book{}, err
	}
	validated.ID = id
	return b.repo.UpdateBook(ctx, validated)
}

// DeleteBook deletes the book identified by id. Returns
// domain.ErrBookNotFound if no book has that id.
func (b *Books) DeleteBook(ctx context.Context, id int64) error {
	return b.repo.DeleteBook(ctx, id)
}

// validateBook trims book's Title and Author and rejects it if either is
// empty afterward.
func validateBook(book domain.Book) (domain.Book, error) {
	book.Title = strings.TrimSpace(book.Title)
	book.Author = strings.TrimSpace(book.Author)

	if book.Title == "" {
		return domain.Book{}, ErrTitleRequired
	}
	if book.Author == "" {
		return domain.Book{}, ErrAuthorRequired
	}

	return book, nil
}

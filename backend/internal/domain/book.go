// Package domain holds the backend's core business entities and the
// repository contract they depend on. It has no dependency on any
// transport (HTTP) or persistence (SQL) technology: Book carries no
// json or SQL scanning concerns, and BookRepository is the seam that
// dependency inversion happens across — repository implements it,
// usecase (see ticket #30) depends on it. See ADR 0004 for the full
// layering this package anchors.
package domain

import (
	"context"
	"errors"
)

// ErrBookNotFound indicates that no book exists with the given ID.
var ErrBookNotFound = errors.New("domain: book not found")

// Book is a single book in the home library. It is a plain entity: no
// json or SQL scanning tags. repository maps its own row-scan concerns
// to and from Book, and handler maps its own request/response DTOs to
// and from Book, so neither concern leaks into this type.
type Book struct {
	ID       int64
	Title    string
	Author   string
	Year     *int
	Genre    *string
	CoverURL *string
}

// BookFilter narrows a book listing. A zero-value field means "no filter"
// on that dimension.
type BookFilter struct {
	// Search matches case-insensitively against title OR author, by
	// substring containment.
	Search string
	// Genre matches by exact equality against the stored genre value.
	Genre string
}

// BookRepository is the persistence contract book-related business logic
// depends on. repository.Repository implements it against Postgres.
type BookRepository interface {
	// ListBooks returns a page of books matching filter, ordered by
	// author, then title, then id, along with the total number of
	// matching books.
	ListBooks(ctx context.Context, limit, offset int, filter BookFilter) ([]Book, int, error)
	// CreateBook inserts b and returns it with its generated ID.
	CreateBook(ctx context.Context, b Book) (Book, error)
	// UpdateBook replaces every column of the book identified by b.ID
	// with the values in b and returns the updated row. It returns
	// ErrBookNotFound if no book has that ID.
	UpdateBook(ctx context.Context, b Book) (Book, error)
	// DeleteBook removes the book identified by id. It returns
	// ErrBookNotFound if no book has that ID.
	DeleteBook(ctx context.Context, id int64) error
}

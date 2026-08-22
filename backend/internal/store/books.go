// Package store provides database access for the backend's domain data.
package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// ErrBookNotFound indicates that no book exists with the given ID.
var ErrBookNotFound = errors.New("book not found")

// Book represents a single book in the home library.
type Book struct {
	ID       int64   `json:"id"`
	Title    string  `json:"title"`
	Author   string  `json:"author"`
	Year     *int    `json:"year"`
	Genre    *string `json:"genre"`
	CoverURL *string `json:"coverUrl"`
}

// Store provides access to persisted domain data.
type Store struct {
	db *sql.DB
}

// New returns a Store backed by db.
func New(db *sql.DB) *Store {
	return &Store{db: db}
}

// ListBooks returns a page of books ordered by author, then title, then
// id, along with the total number of books in the library.
func (s *Store) ListBooks(ctx context.Context, limit, offset int) ([]Book, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx, "SELECT count(*) FROM books").Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting books: %w", err)
	}

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, title, author, year, genre, cover_url
		   FROM books
		  ORDER BY author, title, id
		  LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("querying books: %w", err)
	}
	defer func() { _ = rows.Close() }()

	books := []Book{}
	for rows.Next() {
		var b Book
		if err := rows.Scan(&b.ID, &b.Title, &b.Author, &b.Year, &b.Genre, &b.CoverURL); err != nil {
			return nil, 0, fmt.Errorf("scanning book: %w", err)
		}
		books = append(books, b)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating books: %w", err)
	}

	return books, total, nil
}

// CreateBook inserts b and returns it with its generated ID.
func (s *Store) CreateBook(ctx context.Context, b Book) (Book, error) {
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO books (title, author, year, genre, cover_url)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id`,
		b.Title, b.Author, b.Year, b.Genre, b.CoverURL,
	).Scan(&b.ID)
	if err != nil {
		return Book{}, fmt.Errorf("inserting book: %w", err)
	}
	return b, nil
}

// UpdateBook replaces every column of the book identified by b.ID with the
// values in b and returns the updated row. It returns ErrBookNotFound if no
// book has that ID.
func (s *Store) UpdateBook(ctx context.Context, b Book) (Book, error) {
	res, err := s.db.ExecContext(ctx,
		`UPDATE books
		    SET title = $1, author = $2, year = $3, genre = $4, cover_url = $5
		  WHERE id = $6`,
		b.Title, b.Author, b.Year, b.Genre, b.CoverURL, b.ID,
	)
	if err != nil {
		return Book{}, fmt.Errorf("updating book: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return Book{}, fmt.Errorf("checking updated book: %w", err)
	}
	if n == 0 {
		return Book{}, ErrBookNotFound
	}
	return b, nil
}

// DeleteBook removes the book identified by id. It returns ErrBookNotFound
// if no book has that ID.
func (s *Store) DeleteBook(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM books WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting book: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking deleted book: %w", err)
	}
	if n == 0 {
		return ErrBookNotFound
	}
	return nil
}

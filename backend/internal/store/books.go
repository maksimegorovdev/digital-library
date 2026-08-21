// Package store provides database access for the backend's domain data.
package store

import (
	"context"
	"database/sql"
	"fmt"
)

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

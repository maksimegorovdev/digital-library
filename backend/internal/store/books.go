// Package store provides database access for the backend's domain data.
package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
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

// BookFilter narrows a book listing. A zero-value field means "no filter"
// on that dimension.
type BookFilter struct {
	// Search matches case-insensitively against title OR author, by
	// substring containment.
	Search string
	// Genre matches by exact equality against the stored genre value.
	Genre string
}

// Store provides access to persisted domain data.
type Store struct {
	db *sql.DB
}

// New returns a Store backed by db.
func New(db *sql.DB) *Store {
	return &Store{db: db}
}

// ListBooks returns a page of books matching filter, ordered by author,
// then title, then id, along with the total number of matching books.
func (s *Store) ListBooks(ctx context.Context, limit, offset int, filter BookFilter) ([]Book, int, error) {
	where, args := bookFilterClause(filter)

	var total int
	countQuery := "SELECT count(*) FROM books" + where
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting books: %w", err)
	}

	selectQuery := fmt.Sprintf(
		`SELECT id, title, author, year, genre, cover_url
		   FROM books%s
		  ORDER BY author, title, id
		  LIMIT $%d OFFSET $%d`,
		where, len(args)+1, len(args)+2,
	)
	rows, err := s.db.QueryContext(ctx, selectQuery, append(args, limit, offset)...)
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

// likePatternEscaper escapes ILIKE wildcard characters so a search term is
// matched as a literal substring, not interpreted as a pattern.
var likePatternEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

// bookFilterClause builds a parameterized SQL WHERE clause (or "" for no
// filter) and its positional args for filter. The returned args are always
// safe to pass alongside the clause: values never appear in the SQL text
// itself, only as placeholders.
func bookFilterClause(filter BookFilter) (string, []any) {
	var conditions []string
	var args []any

	if search := strings.TrimSpace(filter.Search); search != "" {
		args = append(args, "%"+likePatternEscaper.Replace(search)+"%")
		conditions = append(conditions, fmt.Sprintf("(title ILIKE $%d OR author ILIKE $%d)", len(args), len(args)))
	}
	if filter.Genre != "" {
		args = append(args, filter.Genre)
		conditions = append(conditions, fmt.Sprintf("genre = $%d", len(args)))
	}

	if len(conditions) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(conditions, " AND "), args
}

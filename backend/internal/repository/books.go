// Package repository provides Postgres-backed access to the backend's
// domain data. Repository implements domain.BookRepository; the mapping
// between database rows and domain.Book lives entirely in this package,
// keeping domain.Book free of persistence concerns.
package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/digital-library/backend/internal/domain"
)

// Repository provides access to persisted domain data.
type Repository struct {
	db *sql.DB
}

// New returns a Repository backed by db.
func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Repository implements domain.BookRepository.
var _ domain.BookRepository = (*Repository)(nil)

// ListBooks returns a page of books matching filter, ordered by author,
// then title, then id, along with the total number of matching books.
func (r *Repository) ListBooks(ctx context.Context, limit, offset int, filter domain.BookFilter) ([]domain.Book, int, error) {
	where, args := bookFilterClause(filter)

	var total int
	countQuery := "SELECT count(*) FROM books" + where
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting books: %w", err)
	}

	selectQuery := fmt.Sprintf(
		`SELECT id, title, author, year, genre, cover_url
		   FROM books%s
		  ORDER BY author, title, id
		  LIMIT $%d OFFSET $%d`,
		where, len(args)+1, len(args)+2,
	)
	rows, err := r.db.QueryContext(ctx, selectQuery, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("querying books: %w", err)
	}
	defer func() { _ = rows.Close() }()

	books := []domain.Book{}
	for rows.Next() {
		var b domain.Book
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
func bookFilterClause(filter domain.BookFilter) (string, []any) {
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

// CreateBook inserts b and returns it with its generated ID.
func (r *Repository) CreateBook(ctx context.Context, b domain.Book) (domain.Book, error) {
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO books (title, author, year, genre, cover_url)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id`,
		b.Title, b.Author, b.Year, b.Genre, b.CoverURL,
	).Scan(&b.ID)
	if err != nil {
		return domain.Book{}, fmt.Errorf("inserting book: %w", err)
	}
	return b, nil
}

// UpdateBook replaces every column of the book identified by b.ID with the
// values in b and returns the updated row. It returns domain.ErrBookNotFound
// if no book has that ID.
func (r *Repository) UpdateBook(ctx context.Context, b domain.Book) (domain.Book, error) {
	res, err := r.db.ExecContext(ctx,
		`UPDATE books
		    SET title = $1, author = $2, year = $3, genre = $4, cover_url = $5
		  WHERE id = $6`,
		b.Title, b.Author, b.Year, b.Genre, b.CoverURL, b.ID,
	)
	if err != nil {
		return domain.Book{}, fmt.Errorf("updating book: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return domain.Book{}, fmt.Errorf("checking updated book: %w", err)
	}
	if n == 0 {
		return domain.Book{}, domain.ErrBookNotFound
	}
	return b, nil
}

// DeleteBook removes the book identified by id. It returns
// domain.ErrBookNotFound if no book has that ID.
func (r *Repository) DeleteBook(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM books WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting book: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking deleted book: %w", err)
	}
	if n == 0 {
		return domain.ErrBookNotFound
	}
	return nil
}

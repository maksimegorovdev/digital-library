package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/digital-library/backend/internal/store"
)

const (
	defaultBooksLimit = 50
	maxBooksLimit     = 200
)

// bookLister lists a page of books. store.Store satisfies this interface.
type bookLister interface {
	ListBooks(ctx context.Context, limit, offset int, filter store.BookFilter) ([]store.Book, int, error)
}

// bookCreator creates a book. store.Store satisfies this interface.
type bookCreator interface {
	CreateBook(ctx context.Context, b store.Book) (store.Book, error)
}

// bookUpdater replaces a book. store.Store satisfies this interface.
type bookUpdater interface {
	UpdateBook(ctx context.Context, b store.Book) (store.Book, error)
}

// bookDeleter deletes a book. store.Store satisfies this interface.
type bookDeleter interface {
	DeleteBook(ctx context.Context, id int64) error
}

type booksResponse struct {
	Books  []store.Book `json:"books"`
	Total  int          `json:"total"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// writeError writes a JSON {"error": msg} body with the given status,
// giving every books-mutation failure mode the same shape.
func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(errorResponse{Error: msg}); err != nil {
		slog.Error("encoding error response", "error", err)
	}
}

// bookInput is the JSON shape accepted by the create/update routes.
type bookInput struct {
	Title    string  `json:"title"`
	Author   string  `json:"author"`
	Year     *int    `json:"year"`
	Genre    *string `json:"genre"`
	CoverURL *string `json:"coverUrl"`
}

// decodeBookInput reads and validates a bookInput from the request body.
// The returned book has title and author trimmed and is otherwise a
// verbatim copy of the input; ok is false if the body is malformed or
// missing a required field, in which case msg is the error to report.
func decodeBookInput(r *http.Request) (book store.Book, msg string, ok bool) {
	var in bookInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		return store.Book{}, "invalid request body", false
	}

	title := strings.TrimSpace(in.Title)
	author := strings.TrimSpace(in.Author)
	if title == "" {
		return store.Book{}, "title is required", false
	}
	if author == "" {
		return store.Book{}, "author is required", false
	}

	return store.Book{
		Title:    title,
		Author:   author,
		Year:     in.Year,
		Genre:    in.Genre,
		CoverURL: in.CoverURL,
	}, "", true
}

// parseBookID reads the "id" URL parameter set by chi's router.
func parseBookID(r *http.Request) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
}

// BooksHandler returns an http.HandlerFunc that lists books from lister,
// paginated via the "limit" and "offset" query parameters.
func BooksHandler(lister bookLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := parseLimit(r.URL.Query().Get("limit"))
		offset := parseOffset(r.URL.Query().Get("offset"))
		filter := store.BookFilter{
			Search: r.URL.Query().Get("search"),
			Genre:  r.URL.Query().Get("genre"),
		}

		books, total, err := lister.ListBooks(r.Context(), limit, offset, filter)
		if err != nil {
			slog.Error("listing books", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list books")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(booksResponse{
			Books:  books,
			Total:  total,
			Limit:  limit,
			Offset: offset,
		}); err != nil {
			slog.Error("encoding books response", "error", err)
		}
	}
}

// CreateBookHandler returns an http.HandlerFunc that creates a book from
// the JSON request body via creator, requiring a non-empty title and
// author.
func CreateBookHandler(creator bookCreator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		book, msg, ok := decodeBookInput(r)
		if !ok {
			writeError(w, http.StatusBadRequest, msg)
			return
		}

		created, err := creator.CreateBook(r.Context(), book)
		if err != nil {
			slog.Error("creating book", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to create book")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		if err := json.NewEncoder(w).Encode(created); err != nil {
			slog.Error("encoding created book", "error", err)
		}
	}
}

// UpdateBookHandler returns an http.HandlerFunc that replaces every column
// of the book identified by the "id" URL parameter with the JSON request
// body via updater.
func UpdateBookHandler(updater bookUpdater) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseBookID(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid book id")
			return
		}

		book, msg, ok := decodeBookInput(r)
		if !ok {
			writeError(w, http.StatusBadRequest, msg)
			return
		}
		book.ID = id

		updated, err := updater.UpdateBook(r.Context(), book)
		if errors.Is(err, store.ErrBookNotFound) {
			writeError(w, http.StatusNotFound, "book not found")
			return
		}
		if err != nil {
			slog.Error("updating book", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to update book")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(updated); err != nil {
			slog.Error("encoding updated book", "error", err)
		}
	}
}

// DeleteBookHandler returns an http.HandlerFunc that deletes the book
// identified by the "id" URL parameter via deleter.
func DeleteBookHandler(deleter bookDeleter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseBookID(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid book id")
			return
		}

		err = deleter.DeleteBook(r.Context(), id)
		if errors.Is(err, store.ErrBookNotFound) {
			writeError(w, http.StatusNotFound, "book not found")
			return
		}
		if err != nil {
			slog.Error("deleting book", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to delete book")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func parseLimit(raw string) int {
	if raw == "" {
		return defaultBooksLimit
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return defaultBooksLimit
	}
	if v > maxBooksLimit {
		return maxBooksLimit
	}
	return v
}

func parseOffset(raw string) int {
	if raw == "" {
		return 0
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v < 0 {
		return 0
	}
	return v
}

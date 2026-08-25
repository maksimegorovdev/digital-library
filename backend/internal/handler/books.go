package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/digital-library/backend/internal/domain"
	"github.com/digital-library/backend/internal/usecase"
)

const (
	defaultBooksLimit = 50
	maxBooksLimit     = 200
)

// bookLister lists a page of books. usecase.Books satisfies this interface.
type bookLister interface {
	ListBooks(ctx context.Context, limit, offset int, filter domain.BookFilter) ([]domain.Book, int, error)
}

// bookCreator validates and creates a book. usecase.Books satisfies this
// interface.
type bookCreator interface {
	CreateBook(ctx context.Context, b domain.Book) (domain.Book, error)
}

// bookUpdater validates and replaces a book. usecase.Books satisfies this
// interface.
type bookUpdater interface {
	UpdateBook(ctx context.Context, id int64, b domain.Book) (domain.Book, error)
}

// bookDeleter deletes a book. usecase.Books satisfies this interface.
type bookDeleter interface {
	DeleteBook(ctx context.Context, id int64) error
}

// bookResponse is the JSON wire shape of a book in API responses. It exists
// because domain.Book intentionally carries no json tags (see ADR 0004);
// keeping the wire format here, rather than on domain.Book, means this
// package can evolve its response shape independently of the entity.
type bookResponse struct {
	ID       int64   `json:"id"`
	Title    string  `json:"title"`
	Author   string  `json:"author"`
	Year     *int    `json:"year"`
	Genre    *string `json:"genre"`
	CoverURL *string `json:"coverUrl"`
}

// newBookResponse converts a domain.Book to its wire representation.
func newBookResponse(b domain.Book) bookResponse {
	return bookResponse{
		ID:       b.ID,
		Title:    b.Title,
		Author:   b.Author,
		Year:     b.Year,
		Genre:    b.Genre,
		CoverURL: b.CoverURL,
	}
}

// newBookResponses converts a slice of domain.Book to its wire
// representation.
func newBookResponses(books []domain.Book) []bookResponse {
	out := make([]bookResponse, len(books))
	for i, b := range books {
		out[i] = newBookResponse(b)
	}
	return out
}

type booksListResponse struct {
	Books  []bookResponse `json:"books"`
	Total  int            `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
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

// bookRequest is the JSON shape accepted by the create/update routes.
type bookRequest struct {
	Title    string  `json:"title"`
	Author   string  `json:"author"`
	Year     *int    `json:"year"`
	Genre    *string `json:"genre"`
	CoverURL *string `json:"coverUrl"`
}

// toDomain maps in to a domain.Book. Trimming and required-field validation
// are usecase's responsibility (see ADR 0004); this mapping is purely
// structural and passes Title/Author through untrimmed.
func (in bookRequest) toDomain() domain.Book {
	return domain.Book{
		Title:    in.Title,
		Author:   in.Author,
		Year:     in.Year,
		Genre:    in.Genre,
		CoverURL: in.CoverURL,
	}
}

// decodeBookRequest reads a bookRequest from the request body and maps it
// to a domain.Book.
func decodeBookRequest(r *http.Request) (domain.Book, error) {
	var in bookRequest
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		return domain.Book{}, fmt.Errorf("decoding request body: %w", err)
	}
	return in.toDomain(), nil
}

// parseBookID reads the "id" URL parameter set by chi's router.
func parseBookID(r *http.Request) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
}

// errorRule maps a sentinel error to the HTTP status and message written
// when errors.Is matches it against a usecase call's returned error.
type errorRule struct {
	sentinel error
	status   int
	message  string
}

var (
	titleRequiredRule  = errorRule{sentinel: usecase.ErrTitleRequired, status: http.StatusBadRequest, message: "title is required"}
	authorRequiredRule = errorRule{sentinel: usecase.ErrAuthorRequired, status: http.StatusBadRequest, message: "author is required"}
	bookNotFoundRule   = errorRule{sentinel: domain.ErrBookNotFound, status: http.StatusNotFound, message: "book not found"}

	createBookErrorRules = []errorRule{titleRequiredRule, authorRequiredRule}
	updateBookErrorRules = []errorRule{titleRequiredRule, authorRequiredRule, bookNotFoundRule}
	deleteBookErrorRules = []errorRule{bookNotFoundRule}
)

// triageBookError checks err against rules in order, replacing the
// repeated errors.Is/writeError chain that used to live in each of the
// create/update/delete handlers. The first matching rule's status and
// message are written via writeError. If err is non-nil but matches no
// rule, it is logged under logMsg and a 500 is written with internalMsg.
// Returns whether err was non-nil (i.e. whether a response was written),
// so callers can early-return on true.
func triageBookError(w http.ResponseWriter, err error, rules []errorRule, logMsg, internalMsg string) bool {
	if err == nil {
		return false
	}
	for _, rule := range rules {
		if errors.Is(err, rule.sentinel) {
			writeError(w, rule.status, rule.message)
			return true
		}
	}
	slog.Error(logMsg, "error", err)
	writeError(w, http.StatusInternalServerError, internalMsg)
	return true
}

// BooksHandler returns an http.HandlerFunc that lists books from lister,
// paginated via the "limit" and "offset" query parameters.
func BooksHandler(lister bookLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := parseLimit(r.URL.Query().Get("limit"))
		offset := parseOffset(r.URL.Query().Get("offset"))
		filter := domain.BookFilter{
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
		if err := json.NewEncoder(w).Encode(booksListResponse{
			Books:  newBookResponses(books),
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
		book, err := decodeBookRequest(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		created, err := creator.CreateBook(r.Context(), book)
		if triageBookError(w, err, createBookErrorRules, "creating book", "failed to create book") {
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		if err := json.NewEncoder(w).Encode(newBookResponse(created)); err != nil {
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

		book, err := decodeBookRequest(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		updated, err := updater.UpdateBook(r.Context(), id, book)
		if triageBookError(w, err, updateBookErrorRules, "updating book", "failed to update book") {
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(newBookResponse(updated)); err != nil {
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
		if triageBookError(w, err, deleteBookErrorRules, "deleting book", "failed to delete book") {
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

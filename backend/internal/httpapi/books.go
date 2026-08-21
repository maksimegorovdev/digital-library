package httpapi

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/digital-library/backend/internal/store"
)

const (
	defaultBooksLimit = 50
	maxBooksLimit     = 200
)

// bookLister lists a page of books. store.Store satisfies this interface.
type bookLister interface {
	ListBooks(ctx context.Context, limit, offset int) ([]store.Book, int, error)
}

type booksResponse struct {
	Books  []store.Book `json:"books"`
	Total  int          `json:"total"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}

// BooksHandler returns an http.HandlerFunc that lists books from lister,
// paginated via the "limit" and "offset" query parameters.
func BooksHandler(lister bookLister) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := parseLimit(r.URL.Query().Get("limit"))
		offset := parseOffset(r.URL.Query().Get("offset"))

		books, total, err := lister.ListBooks(r.Context(), limit, offset)
		if err != nil {
			slog.Error("listing books", "error", err)
			w.WriteHeader(http.StatusInternalServerError)
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

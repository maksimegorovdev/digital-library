// Package handler builds the backend's HTTP routing and handlers. It
// depends only on usecase — routing, request decoding, status codes, and
// CORS are the only concerns here; business logic lives in usecase. See
// ADR 0004 for the full layering.
package handler

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/digital-library/backend/internal/config"
)

// maxCORSPreflightAgeSeconds bounds how long browsers may cache a
// preflight response before re-checking CORS rules.
const maxCORSPreflightAgeSeconds = 300

// bookUsecase is everything the books routes need from the usecase layer.
// usecase.Books satisfies this interface.
type bookUsecase interface {
	bookLister
	bookCreator
	bookUpdater
	bookDeleter
}

// NewRouter builds the backend's HTTP router: request ID propagation,
// structured logging, panic recovery, CORS for the configured frontend
// origin, and the service's routes.
func NewRouter(cfg config.Config, books bookUsecase) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(structuredLogger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{cfg.FrontendOrigin},
		AllowedMethods: []string{
			http.MethodGet, http.MethodPost, http.MethodPatch,
			http.MethodDelete, http.MethodOptions,
		},
		AllowedHeaders: []string{"Accept", "Content-Type"},
		MaxAge:         maxCORSPreflightAgeSeconds,
	}))

	r.Get("/healthz", HealthzHandler)
	r.Get("/books", BooksHandler(books))
	r.Post("/books", CreateBookHandler(books))
	r.Patch("/books/{id}", UpdateBookHandler(books))
	r.Delete("/books/{id}", DeleteBookHandler(books))

	return r
}

// structuredLogger logs each completed request via slog with structured
// key-value fields — chi's stock middleware.Logger emits colorized free
// text, which does not satisfy the spec's "structured logging" requirement.
func structuredLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		slog.Info("http request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"duration", time.Since(start),
			"request_id", middleware.GetReqID(r.Context()),
		)
	})
}

package httpapi

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

// NewRouter builds the backend's HTTP router: request ID propagation,
// structured logging, panic recovery, CORS for the configured frontend
// origin, and the service's routes.
func NewRouter(cfg config.Config) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(structuredLogger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{cfg.FrontendOrigin},
		AllowedMethods: []string{http.MethodGet, http.MethodOptions},
		AllowedHeaders: []string{"Accept", "Content-Type"},
		MaxAge:         maxCORSPreflightAgeSeconds,
	}))

	r.Get("/healthz", HealthzHandler)

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

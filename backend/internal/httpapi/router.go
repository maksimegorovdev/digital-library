package httpapi

import (
	"net/http"

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
	r.Use(middleware.Logger)
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

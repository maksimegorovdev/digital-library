package httpapi

import "github.com/go-chi/chi/v5"

// NewRouter builds the backend's HTTP router with all routes registered.
// Middleware is added in Task 3.
func NewRouter() *chi.Mux {
	r := chi.NewRouter()
	r.Get("/healthz", HealthzHandler)
	return r
}

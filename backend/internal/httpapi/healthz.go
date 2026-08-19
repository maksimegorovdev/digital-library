// Package httpapi builds the backend's HTTP routing and handlers.
package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// HealthzHandler responds with the service's liveness status. It never
// depends on downstream services (database, cache, ...) — this scaffold
// has none yet — so a 200 response only means the process is up and
// serving requests.
func HealthzHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(map[string]string{"status": "ok"}); err != nil {
		// Response headers are already sent; nothing left to do but let
		// the client observe a truncated body. Log the error for observability.
		slog.Error("encoding healthz response", "error", err)
		return
	}
}

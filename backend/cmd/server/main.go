// Command server runs the digital-library backend HTTP API.
package main

import (
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/digital-library/backend/internal/config"
	"github.com/digital-library/backend/internal/httpapi"
)

const (
	// readHeaderTimeout bounds how long the server waits to read a
	// request's headers, mitigating Slowloris-style attacks.
	readHeaderTimeout = 5 * time.Second
	// readTimeout bounds how long the server waits to read the full
	// request (headers + body).
	readTimeout = 10 * time.Second
	// writeTimeout bounds how long the server has to write a response.
	writeTimeout = 10 * time.Second
)

func main() {
	cfg := config.Load()
	r := httpapi.NewRouter(cfg)

	addr := ":" + cfg.Port
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
	}

	slog.Info("backend listening", "addr", addr, "frontend_origin", cfg.FrontendOrigin)
	if err := srv.ListenAndServe(); err != nil {
		slog.Error("server exited", "error", err)
		os.Exit(1)
	}
}

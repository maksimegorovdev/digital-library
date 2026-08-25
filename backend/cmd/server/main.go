// Command server runs the digital-library backend HTTP API.
package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/digital-library/backend/internal/config"
	"github.com/digital-library/backend/internal/handler"
	"github.com/digital-library/backend/internal/repository"
	"github.com/digital-library/backend/internal/usecase"
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

	maxOpenConns    = 25
	maxIdleConns    = 10
	connMaxLifetime = 5 * time.Minute
	connMaxIdleTime = time.Minute
	pingTimeout     = 5 * time.Second
)

func main() {
	if err := run(); err != nil {
		os.Exit(1)
	}
}

// run wires up the database pool and HTTP server. It returns an error
// instead of calling os.Exit directly so that deferred cleanup (closing
// the database pool, releasing the ping context) always runs.
func run() error {
	if err := loadDotEnv(); err != nil {
		slog.Error("loading .env", "error", err)
		return err
	}

	cfg := config.Load()

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		slog.Error("opening database", "error", err)
		return err
	}
	defer func() {
		if err := db.Close(); err != nil {
			slog.Error("closing database", "error", err)
		}
	}()

	db.SetMaxOpenConns(maxOpenConns)
	db.SetMaxIdleConns(maxIdleConns)
	db.SetConnMaxLifetime(connMaxLifetime)
	db.SetConnMaxIdleTime(connMaxIdleTime)

	pingCtx, cancel := context.WithTimeout(context.Background(), pingTimeout)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		slog.Error("connecting to database", "error", err)
		return err
	}

	books := usecase.New(repository.New(db))
	r := handler.NewRouter(cfg, books)

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
		return err
	}
	return nil
}

// Command server runs the digital-library backend HTTP API.
package main

import (
	"log"
	"net/http"

	"github.com/digital-library/backend/internal/config"
	"github.com/digital-library/backend/internal/httpapi"
)

func main() {
	cfg := config.Load()
	r := httpapi.NewRouter(cfg)

	addr := ":" + cfg.Port
	log.Printf("backend listening on %s (frontend origin %s)", addr, cfg.FrontendOrigin)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}

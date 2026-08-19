// Command server runs the digital-library backend HTTP API.
package main

import (
	"log"
	"net/http"

	"github.com/digital-library/backend/internal/httpapi"
)

func main() {
	r := httpapi.NewRouter()

	addr := ":8080"
	log.Printf("backend listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}

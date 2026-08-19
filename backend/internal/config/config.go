// Package config loads the backend's runtime configuration from
// environment variables, per 12-factor app conventions.
package config

import "os"

// Config holds the backend's runtime configuration.
type Config struct {
	// Port is the TCP port the HTTP server listens on.
	Port string
	// FrontendOrigin is the origin allowed by CORS for browser requests.
	FrontendOrigin string
}

// Load reads configuration from environment variables, applying defaults
// for local development when a variable is unset.
func Load() Config {
	return Config{
		Port:           envOrDefault("PORT", "8080"),
		FrontendOrigin: envOrDefault("FRONTEND_ORIGIN", "http://localhost:3000"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

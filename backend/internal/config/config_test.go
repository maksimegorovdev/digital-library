package config_test

import (
	"testing"

	"github.com/digital-library/backend/internal/config"
)

func TestLoad(t *testing.T) {
	tests := []struct {
		name           string
		portEnv        string
		originEnv      string
		expectedPort   string
		expectedOrigin string
	}{
		{
			name:           "defaults when unset",
			portEnv:        "",
			originEnv:      "",
			expectedPort:   "8080",
			expectedOrigin: "http://localhost:3000",
		},
		{
			name:           "explicit port",
			portEnv:        "9090",
			originEnv:      "",
			expectedPort:   "9090",
			expectedOrigin: "http://localhost:3000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PORT", tt.portEnv)
			t.Setenv("FRONTEND_ORIGIN", tt.originEnv)

			cfg := config.Load()

			if cfg.Port != tt.expectedPort {
				t.Errorf("Port = %q, want %q", cfg.Port, tt.expectedPort)
			}
			if cfg.FrontendOrigin != tt.expectedOrigin {
				t.Errorf("FrontendOrigin = %q, want %q", cfg.FrontendOrigin, tt.expectedOrigin)
			}
		})
	}
}

func TestLoadDatabaseURL(t *testing.T) {
	tests := []struct {
		name        string
		databaseEnv string
		expected    string
	}{
		{
			name:        "default when unset",
			databaseEnv: "",
			expected:    "postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable",
		},
		{
			name:        "explicit value",
			databaseEnv: "postgres://user:pass@db:5432/mydb",
			expected:    "postgres://user:pass@db:5432/mydb",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("DATABASE_URL", tt.databaseEnv)

			cfg := config.Load()

			if cfg.DatabaseURL != tt.expected {
				t.Errorf("DatabaseURL = %q, want %q", cfg.DatabaseURL, tt.expected)
			}
		})
	}
}

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

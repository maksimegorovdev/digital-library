package httpapi_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/digital-library/backend/internal/config"
	"github.com/digital-library/backend/internal/httpapi"
)

func testConfig() config.Config {
	return config.Config{Port: "8080", FrontendOrigin: "http://localhost:3000"}
}

func TestRouterRecoversFromPanic(t *testing.T) {
	t.Parallel()

	r := httpapi.NewRouter(testConfig())
	r.Get("/panic", func(http.ResponseWriter, *http.Request) {
		panic("boom")
	})

	req := httptest.NewRequest(http.MethodGet, "/panic", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func TestRouterAllowsConfiguredOrigin(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	r := httpapi.NewRouter(cfg)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req.Header.Set("Origin", cfg.FrontendOrigin)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != cfg.FrontendOrigin {
		t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, cfg.FrontendOrigin)
	}
}

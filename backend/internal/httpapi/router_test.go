package httpapi_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/digital-library/backend/internal/config"
	"github.com/digital-library/backend/internal/httpapi"
)

func testConfig() config.Config {
	return config.Config{Port: "8080", FrontendOrigin: "http://localhost:3000"}
}

func TestRouterRecoversFromPanic(t *testing.T) {
	t.Parallel()

	r := httpapi.NewRouter(testConfig(), &fakeBookStore{})
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
	r := httpapi.NewRouter(cfg, &fakeBookStore{})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req.Header.Set("Origin", cfg.FrontendOrigin)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != cfg.FrontendOrigin {
		t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, cfg.FrontendOrigin)
	}
}

func TestRouterAllowsBookMutationMethods(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	r := httpapi.NewRouter(cfg, &fakeBookStore{})

	for _, method := range []string{http.MethodPost, http.MethodPatch, http.MethodDelete} {
		req := httptest.NewRequest(http.MethodOptions, "/books", nil)
		req.Header.Set("Origin", cfg.FrontendOrigin)
		req.Header.Set("Access-Control-Request-Method", method)
		rec := httptest.NewRecorder()

		r.ServeHTTP(rec, req)

		allowed := rec.Header().Get("Access-Control-Allow-Methods")
		if !strings.Contains(allowed, method) {
			t.Fatalf("preflight for %s: Access-Control-Allow-Methods = %q, want it to include %s", method, allowed, method)
		}
	}
}

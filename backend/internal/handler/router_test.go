package handler_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/digital-library/backend/internal/config"
	"github.com/digital-library/backend/internal/handler"
)

func testConfig() config.Config {
	return config.Config{Port: "8080", FrontendOrigin: "http://localhost:3000"}
}

func TestRouterRecoversFromPanic(t *testing.T) {
	t.Parallel()

	r := handler.NewRouter(testConfig(), &mockBookUsecase{})
	r.Get("/panic", func(http.ResponseWriter, *http.Request) {
		panic("boom")
	})

	req := httptest.NewRequest(http.MethodGet, "/panic", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	require.Equal(t, http.StatusInternalServerError, rec.Code)
}

func TestRouterAllowsConfiguredOrigin(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	r := handler.NewRouter(cfg, &mockBookUsecase{})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req.Header.Set("Origin", cfg.FrontendOrigin)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	require.Equal(t, cfg.FrontendOrigin, rec.Header().Get("Access-Control-Allow-Origin"))
}

func TestRouterAllowsBookMutationMethods(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	r := handler.NewRouter(cfg, &mockBookUsecase{})

	for _, method := range []string{http.MethodPost, http.MethodPatch, http.MethodDelete} {
		req := httptest.NewRequest(http.MethodOptions, "/books", nil)
		req.Header.Set("Origin", cfg.FrontendOrigin)
		req.Header.Set("Access-Control-Request-Method", method)
		rec := httptest.NewRecorder()

		r.ServeHTTP(rec, req)

		allowed := rec.Header().Get("Access-Control-Allow-Methods")
		require.Contains(t, allowed, method)
	}
}

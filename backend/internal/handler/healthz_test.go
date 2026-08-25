package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/digital-library/backend/internal/handler"
)

func TestHealthzHandler(t *testing.T) {
	t.Parallel()

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	handler.HealthzHandler(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var body struct {
		Status string `json:"status"`
	}
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
	require.Equal(t, "ok", body.Status)
}

package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnv(t *testing.T) {
	t.Run("loads values from a present .env file", func(t *testing.T) {
		dir := t.TempDir()
		envPath := filepath.Join(dir, ".env")
		if err := os.WriteFile(envPath, []byte("BOOKS_DASHBOARD_TEST_VAR=from-dotenv\n"), 0o600); err != nil {
			t.Fatalf("writing .env fixture: %v", err)
		}

		cwd, err := os.Getwd()
		if err != nil {
			t.Fatalf("getting cwd: %v", err)
		}
		t.Cleanup(func() {
			if err := os.Chdir(cwd); err != nil {
				t.Fatalf("restoring cwd: %v", err)
			}
			_ = os.Unsetenv("BOOKS_DASHBOARD_TEST_VAR")
		})
		if err := os.Chdir(dir); err != nil {
			t.Fatalf("chdir into fixture dir: %v", err)
		}

		if err := loadDotEnv(); err != nil {
			t.Fatalf("loadDotEnv() error = %v", err)
		}

		if got := os.Getenv("BOOKS_DASHBOARD_TEST_VAR"); got != "from-dotenv" {
			t.Errorf("BOOKS_DASHBOARD_TEST_VAR = %q, want %q", got, "from-dotenv")
		}
	})

	t.Run("does not error when .env is absent", func(t *testing.T) {
		dir := t.TempDir()
		cwd, err := os.Getwd()
		if err != nil {
			t.Fatalf("getting cwd: %v", err)
		}
		t.Cleanup(func() {
			if err := os.Chdir(cwd); err != nil {
				t.Fatalf("restoring cwd: %v", err)
			}
		})
		if err := os.Chdir(dir); err != nil {
			t.Fatalf("chdir into fixture dir: %v", err)
		}

		if err := loadDotEnv(); err != nil {
			t.Fatalf("loadDotEnv() error = %v, want nil", err)
		}
	})
}

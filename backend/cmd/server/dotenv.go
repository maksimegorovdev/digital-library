package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// loadDotEnv loads environment variables from a .env file in the current
// working directory, if one is present. A missing file is not an error —
// production and CI environments set variables directly, with no .env
// file on disk.
func loadDotEnv() error {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("loading .env: %w", err)
	}
	return nil
}

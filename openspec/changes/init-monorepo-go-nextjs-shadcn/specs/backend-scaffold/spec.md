## ADDED Requirements

### Requirement: Go module layout
Backend SHALL be a Go module rooted at `backend/` with a `cmd/server` entrypoint and application code under `internal/`.

#### Scenario: Starting the server from the module root
- **WHEN** a developer runs `go run ./cmd/server` from `backend/`
- **THEN** the HTTP server SHALL start and listen for connections

### Requirement: Health check endpoint
Backend SHALL expose `GET /healthz` returning HTTP 200 with a JSON body `{"status":"ok"}`.

#### Scenario: Health check succeeds
- **WHEN** a client sends `GET /healthz`
- **THEN** the server SHALL respond with HTTP 200 and JSON body `{"status":"ok"}`

### Requirement: Router and middleware
Backend SHALL route requests through `chi` with middleware for structured logging, panic recovery, request ID propagation, and CORS.

#### Scenario: Recovering from a handler panic
- **WHEN** an unhandled panic occurs while processing a request
- **THEN** the recovery middleware SHALL catch it, log the error, and respond with HTTP 500 without crashing the process

#### Scenario: Allowing the frontend origin
- **WHEN** a request arrives with an `Origin` header matching the configured frontend origin
- **THEN** the server SHALL include CORS headers permitting that origin

### Requirement: Port configuration
Backend SHALL read its listen port from the `PORT` environment variable, defaulting to `8080` when unset.

#### Scenario: No PORT configured
- **WHEN** the `PORT` environment variable is not set
- **THEN** the server SHALL listen on port `8080`

#### Scenario: PORT configured explicitly
- **WHEN** the `PORT` environment variable is set to `9090`
- **THEN** the server SHALL listen on port `9090`

### Requirement: Automated test coverage for health check
Backend SHALL include an automated test that exercises the `/healthz` handler via `net/http/httptest`.

#### Scenario: Handler test passes
- **WHEN** the test suite invokes the `/healthz` handler through `httptest`
- **THEN** the response SHALL have HTTP status 200 and JSON body `{"status":"ok"}`

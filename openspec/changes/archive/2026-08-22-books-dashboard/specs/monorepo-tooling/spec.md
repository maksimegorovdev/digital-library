## ADDED Requirements

### Requirement: Local Database via Docker Compose
The repository SHALL provide a root `docker-compose.yml` that starts a
Postgres service matching the backend's default `DATABASE_URL`
connection parameters.

#### Scenario: Starting Postgres via compose
- **WHEN** a developer runs `docker compose up -d` from the
  repository root
- **THEN** a Postgres 18 container SHALL start, listening on port
  5432, with a database, user, and password matching the backend's
  default `DATABASE_URL`

#### Scenario: Data persists across restarts
- **WHEN** the Postgres container is stopped and started again via
  `docker compose`
- **THEN** previously written data SHALL still be present, backed by
  a named volume

### Requirement: Local Environment Files
Backend and frontend SHALL support local configuration via `.env`
files (`backend/.env`, `frontend/.env.local`), with committed
`.example` templates (`backend/.env.example`,
`frontend/.env.local.example`) documenting the available variables.

#### Scenario: Backend loads .env on startup
- **WHEN** `backend/.env` exists and defines `DATABASE_URL`, `PORT`,
  or `FRONTEND_ORIGIN`
- **THEN** the server SHALL start using those values

#### Scenario: Backend without .env falls back to OS env or defaults
- **WHEN** `backend/.env` does not exist
- **THEN** the server SHALL start normally using OS environment
  variables or its built-in defaults, without erroring

#### Scenario: Example templates stay committed, real files stay untracked
- **WHEN** a developer inspects the repository
- **THEN** `backend/.env.example` and `frontend/.env.local.example`
  SHALL be tracked in git and SHALL document every variable the
  respective service reads, while `backend/.env` and
  `frontend/.env.local` SHALL remain untracked

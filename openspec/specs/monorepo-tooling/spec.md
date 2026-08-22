# monorepo-tooling Specification

## Purpose

TBD

## Requirements

### Requirement: Git repository initialization
The repository SHALL be initialized as a git repository with an initial commit containing the backend, frontend, and tooling scaffold.

#### Scenario: Initial commit exists
- **WHEN** a developer runs `git log` after setup completes
- **THEN** there SHALL be at least one commit whose tree contains `backend/`, `frontend/`, `Makefile`, and `README.md`

### Requirement: Ignore rules for generated artifacts
`.gitignore` SHALL exclude `node_modules`, `.next`, backend build artifacts, and `.env*` files.

#### Scenario: Generated artifacts stay untracked
- **WHEN** a developer builds and runs both services locally
- **THEN** `git status` SHALL NOT list `node_modules`, `.next`, or `.env*` files as untracked or staged

### Requirement: Unified local dev commands
The root `Makefile` SHALL provide `dev`, `backend`, `frontend`, `lint`, and `test` targets.

#### Scenario: Running both services with one command
- **WHEN** a developer runs `make dev` from the repository root
- **THEN** both the backend and frontend processes SHALL start concurrently and be reachable on their configured ports

### Requirement: Setup documentation
The root `README.md` SHALL document prerequisites and how to run each `Makefile` target.

#### Scenario: New developer follows the README
- **WHEN** a new developer follows the steps in `README.md`
- **THEN** they SHALL be able to get both services running locally without needing guidance beyond the document

### Requirement: Git pre-commit safety net
A `lefthook`-managed pre-commit git hook SHALL check staged files in both `backend/` and `frontend/`. Formatters (`gofmt -w`, `prettier --write`) SHALL auto-fix and re-stage the affected files rather than blocking the commit. Linters (`golangci-lint run` on staged `.go` files, `eslint` on staged frontend source files) SHALL block the commit when they fail, independent of which tool made the edit.

#### Scenario: Staged Go files are auto-formatted, lint failures block
- **WHEN** a developer runs `git commit` with staged `.go` files
- **THEN** `gofmt -w` SHALL reformat and re-stage them, and if `golangci-lint run` still fails, the commit SHALL be blocked with the failing check output shown

#### Scenario: Staged frontend files are auto-formatted, lint failures block
- **WHEN** a developer runs `git commit` with staged frontend files
- **THEN** `prettier --write` SHALL reformat and re-stage them, and if `eslint` still fails, the commit SHALL be blocked with the failing check output shown

#### Scenario: Clean staged files commit without interruption
- **WHEN** a developer runs `git commit` with staged files that pass all lint checks
- **THEN** the commit SHALL proceed without manual intervention

### Requirement: Frontend formatter configuration
The frontend project SHALL have `prettier` and `prettier-plugin-tailwindcss` configured via a `.prettierrc` and an npm `format` script, so frontend source files can be formatted consistently, including sorted Tailwind utility classes.

#### Scenario: Running the format script formats frontend source
- **WHEN** a developer runs the frontend `format` script
- **THEN** frontend source files SHALL be rewritten according to the `.prettierrc` configuration, with Tailwind utility classes sorted by `prettier-plugin-tailwindcss`

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

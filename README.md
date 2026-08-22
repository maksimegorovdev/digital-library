# Digital Library

Monorepo for the digital-library project: a Go backend and a Next.js
frontend.

## Layout

- `backend/` — Go API (`chi` router), entrypoint at `cmd/server`
- `frontend/` — Next.js app (App Router, TypeScript, Tailwind, shadcn/ui)

## Prerequisites

- Go 1.26+ (`go version`)
- Node.js 20.9+ and [pnpm](https://pnpm.io/installation)
- [golangci-lint](https://golangci-lint.run/welcome/install/) (for `make lint`)
- Postgres and [golang-migrate](https://github.com/golang-migrate/migrate)
  (the backend fails to start without a reachable, migrated database — see
  Database below)

## Running locally

Set up a local Postgres and run migrations first — see Database below.

```bash
make dev
```

Starts the backend on `http://localhost:8080` and the frontend on
`http://localhost:3000`. Stop with `Ctrl+C`.

Run them individually with `make backend` or `make frontend`.

## Database

The backend needs a local Postgres instance. Start one with Docker
Compose:

```bash
docker compose up -d
```

Apply migrations (requires [golang-migrate](https://github.com/golang-migrate/migrate)):

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" make migrate-up
```

## Other commands

- `make lint` — lint both services
- `make test` — run backend tests
- `make test-e2e` — run frontend e2e tests; Playwright only starts the
  frontend, so the books e2e test additionally requires the backend
  running against a migrated, seeded database — see Database below

## Configuration

- Backend: `PORT` (default `8080`), `FRONTEND_ORIGIN` (default
  `http://localhost:3000`, used for CORS), `DATABASE_URL` (default
  `postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable`),
  `TEST_DATABASE_URL` (optional, no default — used only by
  `backend/internal/store`'s integration tests; when set, running those
  tests truncates the `books` table in whatever database it points to, so
  point it at a separate database such as `digital_library_test`, never at
  the same database used for local dev or e2e tests)
- Frontend: `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`) — copy
  `frontend/.env.local.example` to `frontend/.env.local` to override

Both services read environment variables from local `.env` files. The backend reads
`backend/.env` and the frontend reads `frontend/.env.local`. Both files are gitignored
to avoid committing local configuration. To get started, copy the provided example
files: `cp backend/.env.example backend/.env` and `cp frontend/.env.local.example
frontend/.env.local`, then adjust the values as needed for your local setup.

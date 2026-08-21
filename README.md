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

## Running locally

```bash
make dev
```

Starts the backend on `http://localhost:8080` and the frontend on
`http://localhost:3000`. Stop with `Ctrl+C`.

Run them individually with `make backend` or `make frontend`.

## Database

The backend needs a local Postgres instance. Start one with Docker:

```bash
docker run --name digital-library-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=digital_library -p 5432:5432 -d postgres:16
```

Apply migrations (requires [golang-migrate](https://github.com/golang-migrate/migrate)):

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable" make migrate-up
```

## Other commands

- `make lint` — lint both services
- `make test` — run backend tests

## Configuration

- Backend: `PORT` (default `8080`), `FRONTEND_ORIGIN` (default
  `http://localhost:3000`, used for CORS), `DATABASE_URL` (default
  `postgres://postgres:postgres@localhost:5432/digital_library?sslmode=disable`)
- Frontend: `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`) — copy
  `frontend/.env.local.example` to `frontend/.env.local` to override

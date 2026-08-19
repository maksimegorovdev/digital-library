## 1. Git repository initialization

- [x] 1.1 Run `git init` at the repository root
- [x] 1.2 Update `.gitignore` to exclude `node_modules`, `.next`, backend build artifacts, and `.env*`

## 2. Backend scaffold (`backend/`)

- [x] 2.1 Initialize Go module in `backend/` (`go mod init`) and add `chi` dependency
- [x] 2.2 Create `cmd/server/main.go` entrypoint that builds the router and starts the HTTP server
- [x] 2.3 Implement `GET /healthz` handler returning `{"status":"ok"}` under `internal/`
- [x] 2.4 Wire `chi` middleware: structured (`slog`) logging, `Recoverer`, `RequestID`, CORS for the frontend origin
- [x] 2.5 Read listen port from `PORT` env var with default `8080`
- [x] 2.6 Add `httptest`-based test for the `/healthz` handler
- [x] 2.7 Add `.golangci.yml` and confirm `golangci-lint run` passes

## 3. Frontend scaffold (`frontend/`)

- [x] 3.1 Bootstrap Next.js app in `frontend/` via `create-next-app` (TypeScript, App Router, Tailwind, pnpm)
- [x] 3.2 Initialize `shadcn/ui` and add `button` and `card` components
- [x] 3.3 Add `NEXT_PUBLIC_API_URL` env handling with `http://localhost:8080` fallback, plus `.env.local.example`
- [x] 3.4 Build home page that fetches backend `/healthz` and renders healthy/error states using shadcn `Card`/`Button`
- [x] 3.5 Confirm `pnpm lint` and `pnpm build` pass

## 4. Monorepo dev tooling

- [x] 4.1 Write root `Makefile` with `dev`, `backend`, `frontend`, `lint`, `test` targets (`dev` runs both concurrently)
- [x] 4.2 Write root `README.md` documenting prerequisites and each `Makefile` target
- [x] 4.3 Verify `make dev` starts both services and the frontend home page shows the backend as healthy

## 5. Finalize

- [x] 5.1 Review `git status` to confirm generated artifacts (`node_modules`, `.next`, `.env*`, backend binary) are ignored
- [x] 5.2 Stage the full scaffold and create the initial commit

.PHONY: dev backend frontend lint test test-e2e migrate-up migrate-down

backend:
	cd backend && go run ./cmd/server

frontend:
	cd frontend && pnpm dev

dev:
	@trap 'kill 0' EXIT; \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

lint:
	cd backend && golangci-lint run ./...
	cd frontend && pnpm lint

test:
	cd backend && go test ./...
	cd frontend && pnpm test

test-e2e:
	cd frontend && pnpm test:e2e

migrate-up:
	migrate -database "$$DATABASE_URL" -path backend/migrations up

migrate-down:
	migrate -database "$$DATABASE_URL" -path backend/migrations down 1

.PHONY: dev backend frontend lint test

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

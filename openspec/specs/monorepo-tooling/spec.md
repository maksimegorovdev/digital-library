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

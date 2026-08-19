# frontend-scaffold Specification

## Purpose

TBD

## Requirements

### Requirement: Next.js application scaffold
Frontend SHALL be a TypeScript Next.js application using the App Router, bootstrapped with Tailwind CSS, rooted at `frontend/`.

#### Scenario: Starting the dev server
- **WHEN** a developer runs `pnpm dev` from `frontend/`
- **THEN** the Next.js dev server SHALL start and serve the app on port 3000

### Requirement: shadcn/ui integration
Frontend SHALL have `shadcn/ui` initialized with at least the `button` and `card` components available under the project's UI components directory.

#### Scenario: Using a shadcn/ui component
- **WHEN** a page imports the `Button` or `Card` component from the UI components directory
- **THEN** it SHALL render without error

### Requirement: Backend status display
The home page SHALL fetch the backend's `GET /healthz` endpoint and display its status.

#### Scenario: Backend reachable
- **WHEN** the backend responds to `/healthz` with `{"status":"ok"}`
- **THEN** the home page SHALL display a healthy status state

#### Scenario: Backend unreachable
- **WHEN** the fetch to the backend's `/healthz` fails or times out
- **THEN** the home page SHALL display an error/fallback state instead of crashing

### Requirement: Backend base URL configuration
Frontend SHALL read the backend base URL from the `NEXT_PUBLIC_API_URL` environment variable, with a documented local default when unset.

#### Scenario: Environment variable unset
- **WHEN** `NEXT_PUBLIC_API_URL` is not set
- **THEN** the app SHALL fall back to `http://localhost:8080` rather than throwing

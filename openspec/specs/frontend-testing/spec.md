# frontend-testing Specification

## Purpose

Brings the frontend to test parity with the backend's existing Go test coverage: a Vitest + React Testing Library unit-test setup for component behavior, and a Playwright e2e-test setup for real-browser verification.

## Requirements

### Requirement: Component unit-test setup
The frontend SHALL have a Vitest + React Testing Library unit-test setup, runnable via a package script, covering the theme provider, header, and theme toggle components.

#### Scenario: Running unit tests
- **WHEN** a developer runs the frontend's unit-test script from `frontend/`
- **THEN** Vitest SHALL execute and report pass/fail results for the component tests

#### Scenario: Theme toggle unit coverage
- **WHEN** the unit-test suite runs
- **THEN** it SHALL include a test that selecting a theme option in `ThemeToggle` updates the rendered theme state

### Requirement: End-to-end test setup
The frontend SHALL have a Playwright e2e-test setup, runnable via a package script, that drives the running app in a real browser.

#### Scenario: Running e2e tests
- **WHEN** a developer runs the frontend's e2e-test script from `frontend/`
- **THEN** Playwright SHALL launch the app, execute the e2e scenarios, and report pass/fail results

#### Scenario: Theme persistence e2e coverage
- **WHEN** the e2e suite runs
- **THEN** it SHALL include a scenario that toggles the theme, reloads the page, and asserts the selected theme is still active

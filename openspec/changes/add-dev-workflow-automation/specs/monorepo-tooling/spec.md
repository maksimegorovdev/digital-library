## ADDED Requirements

### Requirement: Git pre-commit safety net
A `lefthook`-managed pre-commit git hook SHALL check staged files in both `backend/` and `frontend/` — running `gofmt -l` and `golangci-lint run` on staged `.go` files, and `prettier --check` and `eslint` on staged frontend source files — and SHALL block the commit when any of these checks fail, independent of which tool made the edit.

#### Scenario: Staged Go files are checked before commit
- **WHEN** a developer runs `git commit` with staged `.go` files that fail `gofmt -l` or `golangci-lint run`
- **THEN** the commit SHALL be blocked and the failing check output SHALL be shown

#### Scenario: Staged frontend files are checked before commit
- **WHEN** a developer runs `git commit` with staged frontend files that fail `prettier --check` or `eslint`
- **THEN** the commit SHALL be blocked and the failing check output SHALL be shown

#### Scenario: Clean staged files commit without interruption
- **WHEN** a developer runs `git commit` with staged files that pass all configured checks
- **THEN** the commit SHALL proceed without manual intervention

### Requirement: Frontend formatter configuration
The frontend project SHALL have `prettier` and `prettier-plugin-tailwindcss` configured via a `.prettierrc` and an npm `format` script, so frontend source files can be formatted consistently, including sorted Tailwind utility classes.

#### Scenario: Running the format script formats frontend source
- **WHEN** a developer runs the frontend `format` script
- **THEN** frontend source files SHALL be rewritten according to the `.prettierrc` configuration, with Tailwind utility classes sorted by `prettier-plugin-tailwindcss`

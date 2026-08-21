## ADDED Requirements

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

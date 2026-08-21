## 1. Frontend formatter (prettier)

- [x] 1.1 Add `prettier` and `prettier-plugin-tailwindcss` to `frontend/package.json` devDependencies and install
- [x] 1.2 Add a `.prettierrc` at `frontend/` configuring the tailwindcss plugin
- [x] 1.3 Add a `format` script to `frontend/package.json` (`prettier --write .`)
- [x] 1.4 Run the `format` script once against the existing frontend source to confirm it applies cleanly

## 2. Git pre-commit safety net (lefthook)

- [x] 2.1 Add `lefthook` as a repo dev tool and create `lefthook.yml` at the repo root
- [x] 2.2 Configure the pre-commit hook to run `gofmt -l` and `golangci-lint run` on staged `.go` files under `backend/`
- [x] 2.3 Configure the pre-commit hook to run `prettier --check` and `eslint` on staged frontend source files under `frontend/`
- [x] 2.4 Run `lefthook install` locally and verify a commit with a deliberately malformatted file is blocked, then verify a clean commit proceeds

## 3. Claude Code hooks (via `update-config` skill)

- [x] 3.1 Invoke the `update-config` skill to add a `Stop` hook that scopes test runs by `git diff HEAD --name-only` (`go test ./...` for `backend/`, `pnpm test` for `frontend/`, excluding `pnpm test:e2e`), running nothing when no code paths changed
- [x] 3.2 Invoke the `update-config` skill to add a `PostToolUse` hook on `Edit`/`Write` that formats only the touched file (`gofmt -w` for `.go`, `prettier --write` for frontend source extensions)
- [x] 3.3 Invoke the `update-config` skill to add a `PreToolUse` hook on `Skill`/`Task` tool calls that appends a timestamped entry to `.claude/logs/skill-activity.log`
- [x] 3.4 Add `.claude/logs/` to `.gitignore`

## 4. Frontend skill force-trigger

- [x] 4.1 Add the `ui-ux-pro-max` force-trigger rule to `frontend/AGENTS.md`, matching the existing Go-skill force-trigger pattern in the root `AGENTS.md`

## 5. Documentation

- [x] 5.1 Document in `AGENTS.md` (or a short root-level section) how the test/format/logging hooks work, that they are additive to TDD (not a replacement), and how to check `.claude/logs/skill-activity.log`

## 6. Manual verification

- [ ] 6.1 Edit a `.go` file and confirm `gofmt` runs automatically on save via the `PostToolUse` hook
- [ ] 6.2 Edit a `.tsx`/`.ts` file and confirm `prettier` runs automatically via the `PostToolUse` hook
- [ ] 6.3 End a turn after a `backend/` change and confirm `go test ./...` runs via the `Stop` hook; repeat for a `frontend/` change and `pnpm test`
- [ ] 6.4 End a turn with only doc changes and confirm no test command runs
- [ ] 6.5 Invoke a skill and a subagent and confirm both are logged to `.claude/logs/skill-activity.log`
- [ ] 6.6 Attempt a commit with a deliberately malformatted staged file and confirm the `lefthook` pre-commit hook blocks it

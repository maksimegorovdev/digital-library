## Context

`digital-library` is a monorepo with a Go backend (`backend/`, chi router, `.golangci.yml` with `errcheck`, `govet`, `staticcheck`, `unused`, `gocritic`, `revive`, `misspell`) and a Next.js 16 frontend (`frontend/`, shadcn/ui, vitest for unit tests, Playwright for e2e, eslint for linting). The `Makefile` exposes manual `make lint` / `make test` targets.

There is currently no automation enforcing quality gates: no git hooks (no husky/lefthook), no CI workflows, and no hooks configured in `.claude/settings.json` (only `enableAllProjectMcpServers` and the `superpowers` plugin are enabled). The project already follows an OpenSpec + Superpowers workflow, which implies TDD (`superpowers:test-driven-development`) during implementation, but nothing verifies that tests actually get run before a task is considered done, that formatting/linting is applied consistently, that the `ui-ux-pro-max` skill (which triggers on description-match, not deterministically) is used for frontend work, or that the right skills/MCPs actually fired during a session.

Stakeholder: solo developer using Claude Code as the primary implementation tool, wants low-friction automation that doesn't add meaningful latency or token cost to every single edit.

## Goals / Non-Goals

**Goals:**
- Ensure tests (`go test`, `pnpm test`) are run automatically before Claude ends a turn, scoped to what actually changed, without re-running the full suite (including e2e) on every edit.
- Automatically format/lint code at two layers: a fast, file-scoped layer during Claude Code editing, and a repo-wide safety-net layer at git commit time that works regardless of which tool made the edit.
- Add `prettier` (+ `prettier-plugin-tailwindcss`) to the frontend, which currently has no formatter (only eslint).
- Guarantee `ui-ux-pro-max` is loaded for any frontend/UI task via an explicit force-trigger rule in `frontend/AGENTS.md`, mirroring the existing Go-skill force-trigger list in the root `AGENTS.md`.
- Provide an objective, greppable record of which skills/subagents actually fired during a session, so the user can verify the OpenSpec + Superpowers workflow is invoking what it's supposed to.

**Non-Goals:**
- No CI/GitHub Actions pipeline (out of scope for this change; may be a follow-up).
- No blocking of Claude's work on lint/format failures at the point of edit — the PostToolUse layer auto-fixes rather than blocks; only the pre-commit hook blocks.
- Playwright e2e tests (`pnpm test:e2e`) are not run automatically — too slow/heavy for a per-turn hook; stays a manual/future-CI step.
- Not building a full observability/analytics system for skill usage — just a local append-only log file and a documented way to read it.

## Decisions

- **Test hook fires on `Stop`, not `PostToolUse`.** Running `go test ./...` / `pnpm test` after every single file edit would be wasteful and slow. A `Stop` hook runs once when Claude's turn ends, which is both cheaper and matches the actual question ("was this task verified before being considered done?").
- **Test hook scopes by changed path, not by full repo.** It inspects `git diff --name-only` (against the working tree) and only runs `go test ./...` when `backend/**` changed, and only `pnpm test` when `frontend/**` changed. If neither changed (e.g., docs-only edit), no tests run.
- **Format/lint runs at two layers instead of one.** A Claude-side `PostToolUse` hook (matching `Edit`/`Write` on `*.go` and frontend source extensions) auto-formats just the touched file (`gofmt -w`, `prettier --write`) — fast, cheap, immediate feedback. A `lefthook` pre-commit hook re-checks all staged files (`gofmt -l`, `golangci-lint run`, `prettier --check`, `eslint`) as a safety net that also catches edits made outside Claude Code (manual edits, other tools, merges).
- **lefthook over husky.** lefthook is a single static binary with one YAML config and no Node dependency, which fits a mixed Go+Node monorepo better than a Node-only tool like husky.
- **`ui-ux-pro-max` force-trigger lives in `frontend/AGENTS.md`, not the root `AGENTS.md`.** It only applies to frontend work, matching how the skill's own description scopes it; this keeps the root `AGENTS.md`'s Go-skill list uncluttered.
- **Skill/MCP visibility via a `PreToolUse` hook on `Skill` and `Task`, logging to a local, gitignored file.** This gives an objective trail of what fired without needing to re-read the whole transcript, and without shipping any data outside the machine.
- **Hooks are written via the `update-config` skill during implementation, not hand-authored JSON.** Reduces risk of malformed `.claude/settings.json` hook definitions (matcher syntax, event names) since `update-config` is the harness's own dedicated skill for this file.

## Risks / Trade-offs

- **[Risk] `git diff` scoping in the Stop hook may miss changes made outside the working tree it inspects (e.g., already-committed-but-unpushed changes from a prior turn).** → Mitigation: scope against `git diff HEAD` (working tree + staged) rather than only unstaged diff, so it covers everything not yet on the remote; document the exact scoping command in the hook itself.
- **[Risk] Auto-formatting on every `Edit`/`Write` could clash with Claude's own in-progress multi-step edits (e.g., reformatting a file Claude is about to edit again) or add noticeable latency on large files.** → Mitigation: keep the PostToolUse formatter file-scoped (never whole-project) and let gofmt/prettier run only on the single touched file, which is sub-second.
- **[Risk] Two configuration surfaces (`.claude/settings.json` hooks and `lefthook.yml`) can drift out of sync (e.g., one enables a linter the other doesn't).** → Mitigation: both layers call the same underlying commands (`golangci-lint`, `gofmt`, `prettier`, `eslint`) with the same config files (`.golangci.yml`, `.prettierrc`), so there is a single source of truth for rules; the two hooks differ only in scope (one file vs. staged files) and trigger point, not in rule configuration.
- **[Risk] The skill-activity log could grow unbounded over a long session.** → Mitigation: it's a plain append-only text file the user can clear anytime; not in scope to add rotation for this change given the low expected volume.
- **[Risk] `prettier` and `eslint` can disagree on formatting-adjacent rules.** → Mitigation: rely on `eslint-config-next`'s defaults, which do not include conflicting stylistic rules; if a conflict surfaces during implementation, disable the specific eslint stylistic rule rather than fighting prettier.

## Migration Plan

1. Add `prettier` + `prettier-plugin-tailwindcss` to `frontend/package.json`, with a `.prettierrc` and a `format` script.
2. Add `lefthook` (or a chosen equivalent) as a dev tool with a `lefthook.yml` at repo root covering both `backend/` and `frontend/` staged files; install its git hook locally.
3. Use the `update-config` skill to add the `Stop` (scoped test run) and `PostToolUse` (scoped format) hooks to `.claude/settings.json`.
4. Use the `update-config` skill to add the `PreToolUse` skill/MCP logging hook, and add `.claude/logs/` to `.gitignore`.
5. Add the `ui-ux-pro-max` force-trigger rule to `frontend/AGENTS.md`.
6. Document (root `AGENTS.md` or a short section) how to verify tests/lint/skill-logging are firing, and that this is additive to — not a replacement for — TDD and the Go-skill force-trigger list.
7. Manually verify each hook fires as expected (edit a `.go` file, edit a `.tsx` file, invoke a skill) before considering the change complete.

Rollback: hooks and `lefthook.yml` are additive config; removing the relevant entries from `.claude/settings.json` / `lefthook.yml` (or `lefthook uninstall`) fully reverts behavior with no code impact.

## Open Questions

None — design approved by the user.

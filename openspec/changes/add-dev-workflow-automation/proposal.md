## Why

The project follows an OpenSpec + Superpowers workflow, which implies TDD, but nothing actually verifies tests ran before a task is done, enforces formatting/linting, guarantees `ui-ux-pro-max` fires for frontend work, or shows which skills/MCPs actually triggered during a session. There are no git hooks, no CI, and no `.claude/settings.json` hooks today. Adding cheap, scoped automation closes this gap without slowing down every single edit.

## What Changes

**Format/lint automation, two layers**
- From: Formatting/linting only happens when `make lint` is run manually; frontend has no formatter at all (only eslint).
- To: A `PostToolUse` hook auto-formats the single touched file after `Edit`/`Write` (`gofmt -w` for `.go`, `prettier --write` for frontend source); a `lefthook` pre-commit hook re-checks all staged files as a tool-independent safety net — formatters (`gofmt -w`, `prettier --write`) auto-fix and re-stage, linters (`golangci-lint run`, `eslint`) block the commit on failure.
- Reason: Fast, cheap feedback during Claude Code sessions, plus a safety net that also covers edits made outside Claude Code.
- Impact: Non-breaking; adds `prettier` + `prettier-plugin-tailwindcss` to frontend devDependencies, adds `lefthook` as a repo dev tool, adds `.prettierrc` and a `lefthook.yml`.

**Guaranteed `ui-ux-pro-max` usage for frontend work**
- From: The skill only fires when its description happens to match the model's judgment of the task.
- To: `frontend/AGENTS.md` gets an explicit force-trigger rule (same pattern already used for the Go skill list in the root `AGENTS.md`): load `ui-ux-pro-max` before any UI/frontend design, build, review, or fix task.
- Reason: Description-based matching is not deterministic; this project already has a proven pattern (root `AGENTS.md`) for forcing skill triggers.
- Impact: Non-breaking; documentation-only change to `frontend/AGENTS.md`.

**Visibility into which skills/MCPs actually ran**
- From: No way to confirm which skills/subagents fired during a session other than manually reading the transcript.
- To: A `PreToolUse` hook on `Skill`/`Task` tool calls appends a timestamped line (skill/agent name, key input) to a local, gitignored log file (`.claude/logs/skill-activity.log`); a short note documents how to check it.
- Reason: Gives an objective, greppable record instead of relying on transcript review.
- Impact: Non-breaking; adds a hook, a `.gitignore` entry, and a short documentation note.

## Capabilities

### New Capabilities
- `dev-workflow-automation`: Claude Code session automation — a scoped format/lint hook, a skill/MCP activity logging hook, and the `ui-ux-pro-max` force-trigger rule for frontend work.

### Modified Capabilities
- `monorepo-tooling`: add a git pre-commit safety net (`lefthook` running formatters/linters on staged files across both `backend/` and `frontend/`) and a frontend formatter (`prettier` + `prettier-plugin-tailwindcss`, `.prettierrc`, `format` script) alongside the existing `make lint`/`make test` targets.

## Impact

- `.claude/settings.json`: new `PostToolUse` and `PreToolUse` hooks (written via the `update-config` skill).
- `.claude/logs/`: new gitignored directory for the skill-activity log.
- `frontend/package.json`: new `prettier`, `prettier-plugin-tailwindcss` devDependencies and a `format` script; new `.prettierrc`.
- Repo root: new `lefthook.yml` and `lefthook` as a dev-tool dependency (git hook installed locally, no runtime app impact).
- `frontend/AGENTS.md`: new force-trigger rule for `ui-ux-pro-max`.
- `AGENTS.md` (or a short root-level doc section): note on how to verify hooks/skill-logging are firing.
- No changes to application code, APIs, or runtime behavior of the digital-library product itself — this change is dev-tooling only.

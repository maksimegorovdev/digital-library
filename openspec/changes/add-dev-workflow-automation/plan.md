# Dev Workflow Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up scoped test-run, format/lint, and skill-visibility automation for the digital-library monorepo, plus a force-trigger rule for `ui-ux-pro-max`, without adding meaningful latency to every edit.

**Architecture:** Two independent automation layers — Claude Code hooks (`.claude/settings.json`, fast and file/turn-scoped, added via the `update-config` skill) for in-session feedback, and a `lefthook` git pre-commit hook (tool-independent, repo-wide on staged files) as a safety net — plus two documentation-only edits (`frontend/AGENTS.md`, root `AGENTS.md`).

**Tech Stack:** Go (`gofmt`, `golangci-lint`), Next.js/pnpm (`prettier`, `prettier-plugin-tailwindcss`, `eslint`, `vitest`), `lefthook`, Claude Code hooks (`Stop`, `PostToolUse`, `PreToolUse`).

**Spec:** `openspec/changes/add-dev-workflow-automation/design.md`, `openspec/changes/add-dev-workflow-automation/specs/dev-workflow-automation/spec.md`, `openspec/changes/add-dev-workflow-automation/specs/monorepo-tooling/spec.md`

## Global Constraints

- No application code, API, or runtime behavior changes — this change is dev-tooling only (per proposal.md Impact section).
- Test/format hooks MUST be scoped (single file for format, changed-area only for tests) — never run against the whole repo on every edit.
- `pnpm test:e2e` (Playwright) MUST NOT run automatically from any hook.
- `.claude/settings.json` hook edits MUST go through the `update-config` skill, not hand-written JSON.
- New local-only artifacts (`.claude/logs/skill-activity.log`) MUST be gitignored.

---

### Task 1: Frontend formatter (prettier)

**Files:**
- Modify: `frontend/package.json` (devDependencies, add `format` script)
- Create: `frontend/.prettierrc`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `pnpm --dir frontend format` command and `frontend/.prettierrc` config, both consumed by Task 3 (Claude PostToolUse hook) and Task 2 (lefthook `prettier --check`).

- [ ] **Step 1: Add prettier dependencies**

Run:
```bash
cd frontend && pnpm add -D prettier prettier-plugin-tailwindcss
```

- [ ] **Step 2: Create the prettier config**

Create `frontend/.prettierrc`:
```json
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all"
}
```

- [ ] **Step 3: Add the format script**

In `frontend/package.json`, inside `"scripts"`, add:
```json
"format": "prettier --write ."
```

- [ ] **Step 4: Run the formatter against existing source and verify it's clean**

Run:
```bash
cd frontend && pnpm format
```
Expected: exits 0; `git status` shows only formatting-driven diffs (if any) in `frontend/src/**` — no errors about missing config/plugin.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/.prettierrc
git commit -m "chore(frontend): add prettier with tailwind class sorting"
```

---

### Task 2: Git pre-commit safety net (lefthook)

**Files:**
- Create: `lefthook.yml` (repo root)
- Modify: `.gitignore` (repo root) — add lefthook local state if needed (`.git/hooks` entries are not tracked; no gitignore change required unless lefthook creates a cache dir)

**Interfaces:**
- Consumes: `frontend/.prettierrc` and `pnpm format`/`lint` scripts from Task 1; `backend/.golangci.yml` (existing).
- Produces: an installed pre-commit git hook that later tasks' manual verification (Task 6) exercises.

- [ ] **Step 1: Install lefthook as a dev tool**

Run (macOS, per project platform):
```bash
brew install lefthook
```
Expected: `lefthook version` prints a version string.

- [ ] **Step 2: Write lefthook.yml**

Create `lefthook.yml` at the repo root:
```yaml
pre-commit:
  parallel: true
  commands:
    go-fmt:
      root: "backend/"
      glob: "*.go"
      run: gofmt -l {staged_files}
      fail_text: "gofmt found unformatted files — run `gofmt -w` on them"
    go-lint:
      root: "backend/"
      glob: "*.go"
      run: golangci-lint run {staged_files}
    frontend-format:
      root: "frontend/"
      glob: "*.{ts,tsx,js,jsx,css,json}"
      run: pnpm exec prettier --check {staged_files}
    frontend-lint:
      root: "frontend/"
      glob: "*.{ts,tsx,js,jsx}"
      run: pnpm exec eslint {staged_files}
```

- [ ] **Step 3: Install the git hook locally**

Run:
```bash
lefthook install
```
Expected: `.git/hooks/pre-commit` is created/updated by lefthook (verify with `cat .git/hooks/pre-commit | head -3` — should reference lefthook).

- [ ] **Step 4: Verify the hook blocks a bad commit**

Run:
```bash
echo 'package main
func main(){int x=1}' > backend/cmd/server/tmp_badfmt.go
git add backend/cmd/server/tmp_badfmt.go
git commit -m "test: verify lefthook blocks bad formatting"
```
Expected: commit is rejected, `go-fmt` (or `go-lint`, since the snippet is also invalid Go) reports a failure.

- [ ] **Step 5: Clean up the test file and verify a clean commit passes**

Run:
```bash
git reset HEAD backend/cmd/server/tmp_badfmt.go
rm backend/cmd/server/tmp_badfmt.go
git add lefthook.yml
git commit -m "chore: add lefthook pre-commit safety net for gofmt/golangci-lint/prettier/eslint"
```
Expected: commit succeeds (lefthook.yml itself passes all hooks since it's not a `.go`/frontend source file).

---

### Task 3: Claude Code hooks (via `update-config` skill)

**Files:**
- Modify: `.claude/settings.json` (via the `update-config` skill, not hand-edited)
- Modify: `.gitignore` (repo root) — add `.claude/logs/`

**Interfaces:**
- Consumes: `pnpm test` / `go test ./...` (existing Makefile-equivalent commands), `gofmt -w` / `pnpm exec prettier --write` from Task 1.
- Produces: three hooks other tasks' manual verification (Task 6) exercises; `.claude/logs/skill-activity.log` consumed by Task 5's documentation.

- [ ] **Step 1: Add `.claude/logs/` to `.gitignore`**

In `.gitignore` (repo root), under a new `# Claude Code local state` section, add:
```
.claude/logs/
```

- [ ] **Step 2: Invoke `update-config` to add the Stop hook (scoped test run)**

Invoke the `update-config` skill with this exact hook to add under the `Stop` event in `.claude/settings.json`:
- Event: `Stop`
- Command (bash):
```bash
changed=$(git diff HEAD --name-only); status=0; \
if echo "$changed" | grep -q '^backend/'; then (cd backend && go test ./...) || status=1; fi; \
if echo "$changed" | grep -q '^frontend/'; then (cd frontend && pnpm test) || status=1; fi; \
exit $status
```
- Behavior: on non-zero exit, the hook's stderr/output SHALL be surfaced back to Claude as the reason the turn cannot end yet (standard Claude Code Stop-hook blocking behavior), per `dev-workflow-automation` spec's "Scoped test verification before turn completion" requirement.

- [ ] **Step 3: Invoke `update-config` to add the PostToolUse hook (scoped format)**

Invoke the `update-config` skill with this exact hook to add under the `PostToolUse` event, matcher `Edit|Write`, in `.claude/settings.json`:
- Event: `PostToolUse`, matcher: `Edit|Write`
- Command (bash) — reads `tool_input.file_path` from the hook's JSON stdin payload:
```bash
file=$(python3 -c "import json,sys; print(json.load(sys.stdin)['tool_input']['file_path'])"); \
case "$file" in \
  *.go) gofmt -w "$file" ;; \
  *.ts|*.tsx|*.js|*.jsx|*.css|*.json) (cd frontend && pnpm exec prettier --write "../$file") ;; \
esac
```

- [ ] **Step 4: Invoke `update-config` to add the PreToolUse hook (skill/MCP activity log)**

Invoke the `update-config` skill with this exact hook to add under the `PreToolUse` event, matcher `Skill|Task`, in `.claude/settings.json`:
- Event: `PreToolUse`, matcher: `Skill|Task`
- Command (bash):
```bash
mkdir -p .claude/logs && \
python3 -c "
import json, sys, datetime
data = json.load(sys.stdin)
name = data.get('tool_name', 'unknown')
inp = data.get('tool_input', {})
key = inp.get('skill') or inp.get('subagent_type') or inp.get('description') or ''
line = f\"{datetime.datetime.now().isoformat()} {name} {key}\"
with open('.claude/logs/skill-activity.log', 'a') as f:
    f.write(line + '\n')
"
```

- [ ] **Step 5: Read back `.claude/settings.json` and confirm all three hooks are present and valid JSON**

Run:
```bash
python3 -m json.tool .claude/settings.json > /dev/null && echo "valid json"
```
Expected: prints `valid json`; manually inspect the file to confirm `hooks.Stop`, `hooks.PostToolUse`, `hooks.PreToolUse` entries exist with the commands above.

- [ ] **Step 6: Commit**

```bash
git add .claude/settings.json .gitignore
git commit -m "feat(claude): add scoped test, format, and skill-activity hooks"
```

---

### Task 4: Frontend skill force-trigger

**Files:**
- Modify: `frontend/AGENTS.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: an instruction consumed by any future Claude session working in `frontend/`.

- [ ] **Step 1: Read the current file**

`frontend/AGENTS.md` currently contains only `@AGENTS.md` (a link to the root file).

- [ ] **Step 2: Add the force-trigger rule**

Append to `frontend/AGENTS.md`:
```markdown

## Required skills

Before any UI/frontend design, build, review, or fix task, load the `ui-ux-pro-max` skill first — regardless of whether its description-based matching would trigger it on its own.
```

- [ ] **Step 3: Commit**

```bash
git add frontend/AGENTS.md
git commit -m "docs(frontend): force-trigger ui-ux-pro-max for frontend tasks"
```

---

### Task 5: Documentation of the automation

**Files:**
- Modify: `AGENTS.md` (repo root)

**Interfaces:**
- Consumes: the hook behaviors from Task 3, the lefthook setup from Task 2.
- Produces: a documented reference for the developer (and future Claude sessions) on how to verify the automation.

- [ ] **Step 1: Add a "Dev workflow automation" section to `AGENTS.md`**

Append to `AGENTS.md`:
```markdown

## Dev workflow automation

- Tests run automatically via a `Stop` hook, scoped to changed areas (`backend/` → `go test ./...`, `frontend/` → `pnpm test`, no e2e). This is additive to TDD (`superpowers:test-driven-development`) — it verifies before a turn ends, it does not replace writing tests first.
- Formatting runs automatically per-file via a `PostToolUse` hook (`gofmt`, `prettier`) and is re-checked repo-wide by a `lefthook` pre-commit hook alongside `golangci-lint`/`eslint`.
- To check which skills/subagents fired during a session: `tail -f .claude/logs/skill-activity.log`.
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document dev workflow automation and how to verify it"
```

---

### Task 6: Manual end-to-end verification

**Files:** none (verification only, matches tasks.md group 6 and `dev-workflow-automation`/`monorepo-tooling` spec scenarios).

**Interfaces:**
- Consumes: all hooks/config from Tasks 1-4.
- Produces: confidence the change meets its specs before archiving.

- [ ] **Step 1: Verify PostToolUse formats a Go file**

In a scratch session, edit any `.go` file in `backend/` to introduce a formatting issue (e.g. extra spaces), let Claude's `Edit` tool apply it, then run:
```bash
git diff backend/<file>.go
```
Expected: the diff shows the file already `gofmt`-clean (the hook ran automatically), matching the "Editing a Go file triggers gofmt" scenario.

- [ ] **Step 2: Verify PostToolUse formats a frontend file**

Repeat Step 1 for a `.tsx` file under `frontend/src/`, confirming `prettier --write` ran automatically, matching the "Editing a frontend source file triggers prettier" scenario.

- [ ] **Step 3: Verify Stop hook runs scoped tests**

Make a small change under `backend/` only, end the turn, and confirm `go test ./...` output appears; then make a change under `frontend/` only and confirm `pnpm test` output appears (and `pnpm test:e2e` does NOT run in either case).

- [ ] **Step 4: Verify Stop hook is a no-op for non-code changes**

Edit only `README.md`, end the turn, and confirm no test command runs, matching the "No code changes skip the test run" scenario.

- [ ] **Step 5: Verify skill/MCP logging**

Invoke any skill (e.g. `git-commit`) and any subagent (`Agent` tool with `subagent_type: "Explore"`), then run:
```bash
tail -5 .claude/logs/skill-activity.log
```
Expected: two new lines, one per invocation, each with a timestamp and name.

- [ ] **Step 6: Verify the log is gitignored**

```bash
git status --porcelain .claude/logs/
```
Expected: no output (nothing untracked/staged under `.claude/logs/`).

- [ ] **Step 7: Verify lefthook blocks a bad commit (re-confirm end-to-end)**

Repeat Task 2 Step 4's malformatted-file check once more now that all other hooks are in place, confirming the commit is still blocked.

- [ ] **Step 8: Final commit if any verification step required fixes**

```bash
git add -A
git commit -m "fix: address issues found during dev workflow automation verification"
```
(Skip this step if verification required no changes.)

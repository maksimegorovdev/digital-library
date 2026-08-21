# dev-workflow-automation Specification

## Purpose

TBD

## Requirements

### Requirement: Scoped format-on-edit automation
A `PostToolUse` hook in `.claude/settings.json` SHALL format the single file just written by an `Edit` or `Write` tool call, using `gofmt -w` for `.go` files and `prettier --write` for frontend source files, without reformatting any other file in the project.

#### Scenario: Editing a Go file triggers gofmt
- **WHEN** Claude edits or writes a `.go` file
- **THEN** the hook SHALL run `gofmt -w` on that file only

#### Scenario: Editing a frontend source file triggers prettier
- **WHEN** Claude edits or writes a frontend source file matched by the hook (e.g. `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.json`)
- **THEN** the hook SHALL run `prettier --write` on that file only

### Requirement: Skill and MCP activity logging
A `PreToolUse` hook in `.claude/settings.json` SHALL append a timestamped entry (tool name and key input, e.g. skill or subagent name) to a local log file at `.claude/logs/skill-activity.log` whenever a `Skill` or `Task` tool call is made, and this log file SHALL be excluded from version control.

#### Scenario: Skill invocation is logged
- **WHEN** Claude invokes the `Skill` tool
- **THEN** a line with a timestamp and the invoked skill name SHALL be appended to `.claude/logs/skill-activity.log`

#### Scenario: Subagent invocation is logged
- **WHEN** Claude invokes the `Task`/`Agent` tool to spawn a subagent
- **THEN** a line with a timestamp and the subagent type SHALL be appended to `.claude/logs/skill-activity.log`

#### Scenario: Log file is excluded from git
- **WHEN** a developer runs `git status` after a session that wrote to the log
- **THEN** `.claude/logs/skill-activity.log` SHALL NOT appear as an untracked or staged file

### Requirement: Frontend force-trigger rule for ui-ux-pro-max
`frontend/AGENTS.md` SHALL instruct that the `ui-ux-pro-max` skill MUST be loaded before any UI/frontend design, build, review, or fix task, regardless of whether the skill's own description-based matching would trigger it.

#### Scenario: Frontend task instructions include the force-trigger rule
- **WHEN** a developer or Claude reads `frontend/AGENTS.md`
- **THEN** it SHALL contain an explicit instruction to load `ui-ux-pro-max` before any UI/frontend design, build, review, or fix task

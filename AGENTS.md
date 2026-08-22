## AGENTS.md files

This file covers rules shared across the whole repo. `backend/` and `frontend/` each have their own `AGENTS.md` with domain-specific rules — read the relevant one before working in that folder:

- `backend/AGENTS.md` — backend-specific rules
- `frontend/AGENTS.md` — frontend-specific rules

## Agent skills

### Issue tracker

Issues live as GitHub issues in `maksimegorovdev/digital-library`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

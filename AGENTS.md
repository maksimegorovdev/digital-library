## AGENTS.md files

This file covers rules shared across the whole repo. `backend/` and `frontend/` each have their own `AGENTS.md` with domain-specific rules — read the relevant one before working in that folder:

- `backend/AGENTS.md` — backend-specific rules
- `frontend/AGENTS.md` — frontend-specific rules

## Language rules

- Claude's own communication — chat responses, clarifying/planning questions, status updates — must always be in Russian, regardless of which skill or workflow is active.
- Within OpenSpec workflows (`openspec-*` / `opsx:*` skills, including `superpowers:brainstorming`), only `brainstorm.md` is written in Russian, since it's the file the user reads and edits directly.
- All other Markdown artifacts produced by OpenSpec or Superpowers skills — `proposal.md`, `design.md`, `tasks.md`, spec deltas, and any other generated `.md` file — must be written in English, to save tokens on repeated re-reads during implementation.
- When generating `proposal.md`/`design.md`/`tasks.md` from a Russian `brainstorm.md`, translate the intent faithfully rather than transliterating — preserve nuance, don't just machine-translate line by line.

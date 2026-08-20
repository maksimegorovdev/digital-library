Before any Go coding, review, debugging, troubleshooting, or setup task, load the `samber/cc-skills-golang@golang-how-to` skill first — it routes to whichever other Go skills the task needs.

## Required Go skills

The following Go skills from `samber/cc-skills-golang` MUST always be applied when working on this project. Load them at the start of every Go-related task, regardless of whether the user explicitly mentions them.

- `samber/cc-skills-golang@golang-code-style`
- `samber/cc-skills-golang@golang-data-structures`
- `samber/cc-skills-golang@golang-design-patterns`
- `samber/cc-skills-golang@golang-documentation`
- `samber/cc-skills-golang@golang-error-handling`
- `samber/cc-skills-golang@golang-modernize`
- `samber/cc-skills-golang@golang-naming`
- `samber/cc-skills-golang@golang-safety` 
- `samber/cc-skills-golang@golang-security`
- `samber/cc-skills-golang@golang-testing`
- `samber/cc-skills-golang@golang-troubleshooting`

## Language rules

- Claude's own communication — chat responses, clarifying/planning questions, status updates — must always be in Russian, regardless of which skill or workflow is active.
- Within OpenSpec workflows (`openspec-*` / `opsx:*` skills, including `superpowers:brainstorming`), only `brainstorm.md` is written in Russian, since it's the file the user reads and edits directly.
- All other Markdown artifacts produced by OpenSpec or Superpowers skills — `proposal.md`, `design.md`, `tasks.md`, spec deltas, and any other generated `.md` file — must be written in English, to save tokens on repeated re-reads during implementation.
- When generating `proposal.md`/`design.md`/`tasks.md` from a Russian `brainstorm.md`, translate the intent faithfully rather than transliterating — preserve nuance, don't just machine-translate line by line.

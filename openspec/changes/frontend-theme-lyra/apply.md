## Apply Summary

All 10 tasks from `plan.md` (23/23 checklist items in `tasks.md`) are implemented and committed on `spec/frontend-theme-lyra`.

## Completed Work

1. **Lyra shadcn preset** — `components.json` reports `"style": "base-lyra"`; `globals.css` carries Lyra's `:root`/`.dark` tokens; `button` and `card` were reinstalled under the new style.
2. **`next-themes` + `ThemeProvider`** — `frontend/src/components/theme-provider.tsx` wraps `next-themes`, mounted in `frontend/src/app/layout.tsx` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`; `<html suppressHydrationWarning>` added.
3. **`Header` + `ThemeToggle`** — `frontend/src/components/header.tsx` (title + toggle) and `frontend/src/components/theme-toggle.tsx` (Base UI `DropdownMenu`, Light/Dark/System via `useTheme()`) mounted above `{children}` in the root layout; `dropdown-menu` shadcn component added.
4. **Vitest + React Testing Library** — `vitest.config.ts`/`vitest.setup.ts` configured; `theme-provider.test.tsx`, `theme-toggle.test.tsx`, `header.test.tsx` all pass via `pnpm test`.
5. **Playwright e2e** — `playwright.config.ts` configured; `e2e/theme-toggle.spec.ts` covers toggle interaction and reload persistence via `pnpm test:e2e`.
6. **Verification** — `pnpm test`, `pnpm test:e2e`, and `pnpm build` all pass; manual/browser spot-check confirmed Light/Dark/System render correctly with Lyra tokens and the choice persists across a reload.

## Deviations from Plan

- The preset identifier applied and recorded in `components.json` is `base-lyra` (not the informal `lyra` name used in `brainstorm.md`/`proposal.md`) — a naming detail, not a scope change (also noted in `design.md`).
- Post-implementation review findings were addressed in a follow-up commit (`fix: address final review findings for frontend-theme-lyra`) after the task-by-task implementation commits.

## Status

Ready for `/opsx:verify` and archive — no outstanding tasks, no open questions.

## Why

The frontend currently ships with a single fixed light theme and the default `base-nova` shadcn style, with no way for a user to switch appearance. It also has zero automated tests while the backend already has Go test coverage for its packages, leaving new frontend UI changes unverified. This change closes both gaps in one pass since the new UI surface (theme toggle, header) is small enough to test thoroughly as it's built.

## What Changes

**shadcn style preset**
- From: `base-nova` style (neutral base color, `nova` tokens), applied to the two installed components (`button`, `card`).
- To: `base-lyra` style, applied via a full preset overwrite (theme tokens, fonts, and the two installed components reinstalled under the new style).
- Reason: user requested `Lyra` as the primary shadcn style.
- Impact: non-breaking visual change; no component API changes.

**Theme switching**
- From: no theme mechanism; `globals.css` defines `.dark` tokens but nothing ever applies the class.
- To: `next-themes`-backed `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) wraps the app; a new `Header` (project title + `ThemeToggle`) is rendered above page content; `ThemeToggle` is a `DropdownMenu`-based Light/Dark/System switch.
- Reason: user requested dark and light theme support with a toggle.
- Impact: non-breaking additive UI; `layout.tsx` gains `suppressHydrationWarning` on `<html>` (required by `next-themes`).

**Frontend testing**
- From: no test framework, no test script, no frontend tests at all.
- To: Vitest + React Testing Library for component unit tests (`ThemeToggle`, `Header`, `ThemeProvider` integration) and `@playwright/test` for e2e coverage of the theme toggle (interaction + persisted theme after reload).
- Reason: user requested frontend tests at parity with the backend's existing test coverage.
- Impact: non-breaking; adds dev dependencies and `pnpm test` / `pnpm test:e2e` scripts.

## Capabilities

### New Capabilities
- `theme-switching`: light/dark/system theme support (next-themes), the `lyra` shadcn style preset, and the header/toggle UI that drives it.
- `frontend-testing`: Vitest + React Testing Library unit-test setup and Playwright e2e-test setup for the frontend app.

### Modified Capabilities
(none — `frontend-scaffold`'s existing shadcn/ui requirement is style-agnostic and remains satisfied as-is; the style preset change doesn't alter its stated requirements or scenarios)

## Impact

- **Affected code**: `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`, `frontend/components.json`, new `frontend/src/components/theme-provider.tsx`, `theme-toggle.tsx`, `header.tsx`, new `frontend/src/components/ui/dropdown-menu.tsx` (via shadcn CLI), new test files, new `frontend/vitest.config.ts` and `frontend/e2e/` directory.
- **Dependencies added**: `next-themes`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom` (or equivalent), `@playwright/test`.
- **No backend or API impact.**

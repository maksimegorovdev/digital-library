## Design Summary

Add dark/light theme support to the frontend, switch the shadcn/ui style preset from `base-nova` to `lyra`, and introduce a minimal header hosting the theme toggle. Bring frontend testing up to par with the backend (which already has Go tests) by adding a Vitest + React Testing Library unit-test setup and a Playwright e2e setup.

Scope:
- Apply the `lyra` shadcn preset (style + theme tokens + fonts), reinstalling the two currently-installed components (`button`, `card`) under the new style. No custom overrides exist today, so this is a safe full overwrite.
- Add `next-themes` for class-based light/dark/system theme switching, compatible with the `.dark` selector already present in `globals.css`.
- Add a minimal `Header` component (project name + `ThemeToggle`) rendered above page content in `layout.tsx`.
- Add `ThemeToggle`: icon button + `DropdownMenu` (Light / Dark / System) using `next-themes`' `useTheme()`. `DropdownMenu` is not yet installed and will be added via the shadcn CLI (Base UI primitives — `render` prop, not `asChild`).
- Add `<html suppressHydrationWarning>` as required by `next-themes` to avoid a hydration-mismatch warning.
- Add frontend test infrastructure: Vitest + React Testing Library for component behavior, and `@playwright/test` for e2e verification (theme toggle interaction, persisted theme after reload). This is a standing gap — the frontend currently has zero tests while the backend has Go stdlib tests for its packages.

## Alternatives Considered

### Alternative A: next-themes + DropdownMenu toggle in a new header (chosen)
- **Approach**: Standard shadcn/Next.js pattern — `ThemeProvider` (next-themes) wraps the app, class-based dark mode, toggle lives in a new minimal header.
- **Pros**: Matches shadcn's documented pattern exactly; system-preference aware; toggle is discoverable; no flash-of-wrong-theme issues once `suppressHydrationWarning` is set.
- **Cons**: Requires adding a header where none existed before (small layout change) and a new dependency (`next-themes`).
- **Why not chosen**: N/A — chosen.

### Alternative B: Manual theme context (no next-themes)
- **Approach**: Hand-rolled `React.Context` + `localStorage` + a `useEffect` toggling the `dark` class on `<html>`.
- **Pros**: Zero extra dependency.
- **Cons**: Reimplements hydration-safe theme persistence and system-preference detection that `next-themes` already solves correctly; more code to maintain and test for an edge case (SSR/hydration) that's easy to get subtly wrong.
- **Why not chosen**: `next-themes` is the de facto standard for this exact problem in Next.js + shadcn projects; no reason to reinvent it.

### Alternative C: Floating toggle button, no header
- **Approach**: Keep the current header-less layout; place a fixed-position icon button (e.g. top-right corner) that toggles the theme directly, no dropdown.
- **Pros**: Minimal footprint, no new layout component.
- **Cons**: No natural place to grow future navigation; a plain two-way toggle doesn't offer a "System" option; floating UI is less conventional than a header for this kind of control.
- **Why not chosen**: User picked adding a minimal header with a Light/Dark/System dropdown over a floating two-way toggle.

## Agreed Approach

Alternative A: `next-themes`-backed `ThemeProvider`, a new minimal `Header` with a `ThemeToggle` (Light/Dark/System dropdown), and the `lyra` shadcn preset applied via full overwrite. Frontend testing is added alongside as a first-class part of this change (Vitest + RTL for components, Playwright for e2e), not deferred.

## Key Decisions

- **Preset switch strategy**: full overwrite of `base-nova` → `lyra` (no custom component overrides exist yet, so this is low-risk).
- **Toggle placement**: new minimal header (title left, toggle right), not a floating button — this also gives the app a home for future navigation.
- **Toggle behavior**: three-way Light/Dark/System via a dropdown, not a plain two-way switch, so system preference is respected by default (`defaultTheme="system"`).
- **Test strategy**: both Vitest + React Testing Library (unit/component) and Playwright (e2e), matching the backend's existing test coverage expectations rather than shipping this UI change untested.

## Open Questions

None — all points were resolved during brainstorming.

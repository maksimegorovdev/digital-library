## Context

The frontend (`frontend/`, Next.js 16.3.1 App Router, React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui on Base UI primitives) shipped with a single fixed light theme under the `base-nova` shadcn style preset, no way to switch appearance, and zero automated tests — while the backend already carries Go test coverage for its packages. `globals.css` already defined `.dark` token selectors, but nothing in the app ever applied the `dark` class, so dark mode was effectively dead code.

Two independent gaps were closed in one pass: appearance (style preset + theme switching) and test parity (unit + e2e). They were bundled because the new UI surface introduced by the theme work (a header, a toggle) is small enough to test thoroughly as it's built, and shipping it untested would have been inconsistent with closing the testing gap at the same time.

## Goals / Non-Goals

**Goals:**
- Switch the shadcn style preset from `base-nova` to `base-lyra` across all currently-installed components.
- Give users a Light / Dark / System theme choice that persists across reloads and respects OS preference by default.
- Introduce a minimal header as the toggle's home, with room for future navigation.
- Bring the frontend to test parity with the backend: component-level unit tests (Vitest + RTL) and a real-browser e2e test (Playwright) covering the toggle-and-persist flow.

**Non-Goals:**
- No changes to backend/API surface.
- No custom design-system overrides beyond the stock `lyra` preset — no bespoke tokens or component variants.
- No navigation beyond the header's title + toggle (no nav links, no auth UI, no responsive nav collapse).
- No broader test coverage of pre-existing pages/components outside what this change touches (backfilling tests for the rest of the app is out of scope).

## Decisions

- **Full-overwrite preset switch (`npx shadcn@latest apply base-lyra -y`) over hand-editing tokens.** No custom component overrides existed on `base-nova`, so there was nothing to preserve; a full overwrite is the CLI's supported path and guarantees `components.json`, `globals.css` tokens/fonts, and the two installed components (`button`, `card`) all move to `lyra` consistently in one step, rather than drifting if edited by hand.

- **`next-themes` over a hand-rolled theme context.** `next-themes` is the de facto standard for class-based dark mode in Next.js + shadcn projects and already solves the hard parts correctly: hydration-safe persistence (no flash-of-wrong-theme once `suppressHydrationWarning` is set) and system-preference detection via `enableSystem`. A hand-rolled `Context` + `localStorage` + `useEffect` would reimplement this and risk getting SSR/hydration edge cases subtly wrong for no benefit. Configured as `attribute="class"`, `defaultTheme="system"`, `enableSystem` — matching the `.dark` class selector already present in `globals.css`.

- **New minimal header over a floating toggle button.** A floating icon button would have a smaller footprint, but a header gives the toggle a conventional, discoverable home and a natural place for future navigation to grow. The header is intentionally minimal: project title on the left, `ThemeToggle` on the right, `border-b` separation — no other chrome.

- **Three-way Light/Dark/System dropdown over a two-way switch.** A plain toggle can't express "follow the OS," which was a stated requirement (`defaultTheme="system"`). A `DropdownMenu` (shadcn, Base UI primitives — `render` prop, not `asChild`, per this project's convention) driven by `useTheme()` from `next-themes` gives three explicit, accessible menu items (`Light`, `Dark`, `System`) behind a single icon-button trigger (`aria-label="Toggle theme"`).

- **Both Vitest+RTL and Playwright, not just one.** Component tests (`ThemeProvider` renders children, `ThemeToggle` switches theme state, `Header` renders title + toggle) verify behavior in isolation and run fast in CI. The Playwright e2e test is the only layer that can verify the thing that actually matters end-to-end: that the `dark` class lands on `<html>` in a real browser and survives a page reload (i.e., `next-themes`' `localStorage` persistence actually works outside of jsdom). Neither layer alone would have covered both concerns.

- **`components.json` preset name is `base-lyra`, not `lyra`.** The brainstorm/proposal referred to the target informally as "lyra"; the actual shadcn preset identifier resolved and applied was `base-lyra` (confirmed in `frontend/components.json`: `"style": "base-lyra"`). This is a naming detail, not a scope change.

## Risks / Trade-offs

- **[Risk] Full-preset-overwrite could silently drop future custom overrides if this pattern is reused later.** → Mitigation: safe today because no overrides existed pre-change; documented here so a future preset change knows to check `git diff` on `globals.css`/component files before overwriting once real customizations exist.
- **[Risk] `next-themes`' `enableSystem` reads `prefers-color-scheme` at hydration; a mismatch between server-rendered markup and the client's actual OS preference is the classic flash-of-wrong-theme failure mode.** → Mitigation: `suppressHydrationWarning` on `<html>` is required and set; this is the documented, expected trade-off `next-themes` itself calls for, not a bug.
- **[Risk] Playwright e2e adds a slower, browser-dependent test tier (real Chromium install, `pnpm build && pnpm start` as a webServer) to the frontend's CI surface.** → Mitigation: scoped narrowly to the one flow that needs a real browser (toggle + reload persistence); component-level behavior stays in the fast Vitest tier.
- **[Risk] Two new test frameworks (Vitest, Playwright) plus `next-themes` and `dropdown-menu` all land in one change, widening the review surface.** → Mitigation: the task breakdown in `tasks.md`/`plan.md` kept each piece independently committable and verifiable (preset switch → provider → header/toggle → unit tests → e2e), so the change could be (and was) built and verified incrementally rather than as one opaque commit.

## Migration Plan

No data migration or backend involvement. Rollout is a standard frontend deploy:
1. Preset switch, `ThemeProvider`, `Header`/`ThemeToggle`, and both test tiers were built and committed incrementally per `plan.md`'s task order (preset → provider/layout wiring → header/toggle UI → Vitest setup → Playwright setup → e2e test → final verification).
2. Verified via `pnpm test` (unit), `pnpm test:e2e` (Playwright), and `pnpm build` (production build), plus a manual/browser spot-check of Light/Dark/System rendering and reload persistence — all tracked as completed in `tasks.md` (23/23).
3. **Rollback**: revert the preset with `npx shadcn@latest apply <pre-change-code> -y` (the pre-change preset code was recorded during Task 1, Step 1 of `plan.md`) plus a standard `git revert` of the theme/header/test commits — no feature flag was introduced since the change is purely additive UI with no destructive effect on existing pages.

## Open Questions

None — brainstorming resolved all open points before implementation began, and implementation (tracked in `tasks.md`) is complete.

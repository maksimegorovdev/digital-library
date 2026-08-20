## 1. Apply the Lyra shadcn style preset

- [ ] 1.1 Resolve the current preset state with `npx shadcn@latest preset resolve` and confirm the target preset name/code for `base-lyra`
- [ ] 1.2 Apply the `lyra` preset with a full overwrite (`npx shadcn@latest apply <lyra-preset> --only theme,font` for tokens/fonts, or `init --preset base-lyra --force --no-reinstall` per the shadcn skill's overwrite flow), then re-add `button` and `card` so they pick up the new style
- [ ] 1.3 Verify `components.json` reports `style: "lyra"` and `globals.css` contains Lyra's light (`:root`) and dark (`.dark`) token values
- [ ] 1.4 Visually spot-check the existing home page in both light and dark (temporarily toggle the `dark` class by hand) to confirm Lyra tokens render correctly

## 2. Add theme provider and dark-mode plumbing

- [ ] 2.1 Add the `next-themes` dependency (`pnpm add next-themes` in `frontend/`)
- [ ] 2.2 Create `frontend/src/components/theme-provider.tsx`: client component wrapping `next-themes`' `ThemeProvider` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`
- [ ] 2.3 Update `frontend/src/app/layout.tsx`: add `suppressHydrationWarning` to `<html>`, wrap `{children}` with `ThemeProvider`

## 3. Add header and theme toggle UI

- [ ] 3.1 Add the `dropdown-menu` shadcn component (`npx shadcn@latest add dropdown-menu`) and verify it uses the project's Base UI (`render` prop) primitives
- [ ] 3.2 Create `frontend/src/components/theme-toggle.tsx`: client component using `useTheme()` from `next-themes`, icon trigger button, `DropdownMenu` with Light/Dark/System items
- [ ] 3.3 Create `frontend/src/components/header.tsx`: project title on the left, `ThemeToggle` on the right
- [ ] 3.4 Render `Header` above `{children}` in `frontend/src/app/layout.tsx`

## 4. Set up component unit testing (Vitest + React Testing Library)

- [ ] 4.1 Add dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` (or the project's preferred DOM environment)
- [ ] 4.2 Add `frontend/vitest.config.ts` (jsdom environment, path aliases matching `tsconfig.json`) and a `pnpm test` script in `frontend/package.json`
- [ ] 4.3 Write `frontend/src/components/theme-toggle.test.tsx`: selecting a theme option updates the rendered theme state
- [ ] 4.4 Write `frontend/src/components/header.test.tsx`: header renders the project title and the theme toggle
- [ ] 4.5 Write a test that `ThemeProvider` renders its children without error

## 5. Set up end-to-end testing (Playwright)

- [ ] 5.1 Add `@playwright/test` as a dev dependency and scaffold `frontend/playwright.config.ts`
- [ ] 5.2 Add a `pnpm test:e2e` script in `frontend/package.json`
- [ ] 5.3 Write `frontend/e2e/theme-toggle.spec.ts`: toggling the theme updates the page's rendered state (e.g. `dark` class on `<html>`)
- [ ] 5.4 Extend the e2e test to reload the page after toggling and assert the selected theme persists

## 6. Verify

- [ ] 6.1 Run `pnpm test` and `pnpm test:e2e` in `frontend/` and confirm all tests pass
- [ ] 6.2 Run `pnpm build` in `frontend/` to confirm the app still builds cleanly
- [ ] 6.3 Manually drive the app (dev server, browser or Playwright MCP) to confirm Light/Dark/System all render correctly with Lyra tokens and the choice persists across a reload

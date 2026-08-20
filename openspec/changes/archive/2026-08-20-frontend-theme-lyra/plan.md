# Frontend Theme (Lyra + Dark/Light) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the frontend's shadcn style to `lyra`, add a light/dark/system theme toggle in a new header, and bring the frontend up to test parity with the backend (Vitest + React Testing Library unit tests, Playwright e2e tests).

**Architecture:** `next-themes` drives class-based (`dark` on `<html>`) theme state; a client `ThemeProvider` wrapper mounts it in the root layout. A new `Header` (title + `ThemeToggle`) renders above page content. `ThemeToggle` is a shadcn `DropdownMenu` (Base UI primitives) driven by `useTheme()`. The `lyra` shadcn preset is applied via the CLI's full-overwrite `apply` command, which regenerates `globals.css` tokens and reinstalls `button`/`card` under the new style. Vitest + RTL cover component behavior; Playwright covers the full toggle-and-persist flow in a real browser.

**Tech Stack:** Next.js 16.3.1 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui (Base UI primitives, not Radix), `next-themes`, Vitest, `@testing-library/react`, `@playwright/test`, pnpm.

**Spec:** `openspec/changes/frontend-theme-lyra/specs/theme-switching/spec.md`, `openspec/changes/frontend-theme-lyra/specs/frontend-testing/spec.md`, `openspec/changes/frontend-theme-lyra/proposal.md`

## Global Constraints

- Package manager: `pnpm` (run all commands from `frontend/`, `packageManager: "pnpm@11.22.0"` in `frontend/package.json`).
- Base UI primitives (`@base-ui/react`), not Radix — custom triggers use the `render` prop, not `asChild`.
- Tailwind v4 with CSS variables (`cssVariables: true` in `components.json`) — theme tokens live in `frontend/src/app/globals.css`, never hardcode raw color values in components.
- Import alias `@/*` → `frontend/src/*` (`frontend/tsconfig.json`).
- No `space-x-*`/`space-y-*` — use `flex`/`gap-*`. Icons inside buttons use `data-icon="inline-start"`, no manual sizing classes.
- TypeScript strict mode is on — no implicit `any`.

---

### Task 1: Apply the Lyra shadcn style preset

**Files:**
- Modify: `frontend/components.json`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/components/ui/button.tsx`
- Modify: `frontend/src/components/ui/card.tsx`
- Modify: `frontend/package.json` (shadcn may adjust preset-related deps)

**Interfaces:**
- Consumes: nothing from earlier tasks (first task).
- Produces: `frontend/components.json` with `"style": "lyra"`; `globals.css` with Lyra's `:root` (light) and `.dark` token values — later tasks (2, 3) rely on the `.dark` class selector already existing in this file, they don't touch its content.

This task has no unit test — it's a CLI-driven config/style change. Verification is a config check plus a manual visual check.

- [ ] **Step 1: Record the current preset for rollback reference**

Run: `cd frontend && npx shadcn@latest preset resolve --json`
Expected output includes `"style": "nova"`. Note the printed `code` value (e.g. `b2fA`) in case you need to revert with `npx shadcn@latest apply <that-code> -y`.

- [ ] **Step 2: Apply the `lyra` preset as a full overwrite**

Run: `cd frontend && npx shadcn@latest apply base-lyra -y`

This overwrites `components.json`'s style, regenerates the CSS variables/fonts in `globals.css`, and reinstalls the two currently-installed components (`button`, `card`) under the Lyra style.

- [ ] **Step 3: Verify the config switched**

Run: `cd frontend && npx shadcn@latest preset resolve --json`
Expected: the `"style"` value is now `"lyra"` (other values — `baseColor: "neutral"`, `iconLibrary: "lucide"`, etc. — should be unchanged).

- [ ] **Step 4: Verify the CSS tokens changed**

Run: `git -C frontend diff --stat src/app/globals.css`
Expected: the file shows changes (non-zero diff) — confirms new Lyra token values were written for both `:root` and `.dark`.

- [ ] **Step 5: Build to confirm nothing broke**

Run: `cd frontend && pnpm build`
Expected: build succeeds with no type or lint errors from the regenerated `button.tsx`/`card.tsx`.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add components.json src/app/globals.css src/components/ui/button.tsx src/components/ui/card.tsx package.json pnpm-lock.yaml
git commit -m "style: switch shadcn preset to lyra"
```

---

### Task 2: Add `next-themes` and the `ThemeProvider` wrapper

**Files:**
- Create: `frontend/src/components/theme-provider.tsx`
- Create: `frontend/src/components/theme-provider.test.tsx`
- Modify: `frontend/package.json` (add `next-themes` dependency)

**Interfaces:**
- Consumes: nothing from Task 1's output beyond the app still building.
- Produces: `ThemeProvider` component (`frontend/src/components/theme-provider.tsx`), a thin client wrapper around `next-themes`' `ThemeProvider`, re-exporting the same props (`attribute`, `defaultTheme`, `enableSystem`, `children`, etc.). Task 3 imports `{ ThemeProvider } from "@/components/theme-provider"` and renders it with `attribute="class" defaultTheme="system" enableSystem` around `{children}`.

- [ ] **Step 1: Install the dependency**

Run: `cd frontend && pnpm add next-themes`

- [ ] **Step 2: Write the failing test**

Create `frontend/src/components/theme-provider.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"

describe("ThemeProvider", () => {
  it("renders its children", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <p>hello</p>
      </ThemeProvider>
    )

    expect(screen.getByText("hello")).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && pnpm vitest run src/components/theme-provider.test.tsx`
Expected: FAIL — `Cannot find module '@/components/theme-provider'` (file doesn't exist yet). (Vitest isn't configured yet either — this will be wired up in Task 4; for now this step documents intent. If Task 4 hasn't run yet, skip straight to Step 5 and come back to run this test once Task 4's Vitest config exists.)

- [ ] **Step 4: Implement `ThemeProvider`**

Create `frontend/src/components/theme-provider.tsx`:

```tsx
"use client"

import type { ComponentProps } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && pnpm vitest run src/components/theme-provider.test.tsx`
Expected: PASS (once Vitest is configured in Task 4 — see Step 3 note).

- [ ] **Step 6: Commit**

```bash
cd frontend
git add package.json pnpm-lock.yaml src/components/theme-provider.tsx src/components/theme-provider.test.tsx
git commit -m "feat: add next-themes ThemeProvider wrapper"
```

---

### Task 3: Wire `ThemeProvider` into the root layout

**Files:**
- Modify: `frontend/src/app/layout.tsx`

**Interfaces:**
- Consumes: `ThemeProvider` from `@/components/theme-provider` (Task 2).
- Produces: root layout renders `<html suppressHydrationWarning>` and wraps `{children}` in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`. Task 5 relies on `<html>` receiving/removing the `dark` class as the active theme changes.

No isolated unit test for this task (it's a layout wiring change) — verified via the dev server and later by the Task 6 Header test and Task 9 e2e test.

- [ ] **Step 1: Update `frontend/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "digital-library",
  description: "digital-library backend status",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Start the dev server and confirm no console errors**

Run: `cd frontend && pnpm dev` (in a background terminal), then open `http://localhost:3000`.
Expected: page renders as before, no hydration-mismatch warning in the browser console. Stop the dev server after checking (`Ctrl+C`).

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/app/layout.tsx
git commit -m "feat: wrap root layout in ThemeProvider"
```

---

### Task 4: Configure Vitest + React Testing Library

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/vitest.setup.ts`
- Modify: `frontend/package.json` (add `test` script + devDependencies)
- Modify: `frontend/tsconfig.json` (add `vitest/jsdom` to `types`)

**Interfaces:**
- Consumes: nothing (infrastructure task).
- Produces: `pnpm test` runs Vitest once (CI mode) over `src/**/*.test.{ts,tsx}` in a `jsdom` environment with `@/*` alias resolution and `@testing-library/jest-dom` matchers loaded. Tasks 2's, 6's, and 7's `*.test.tsx` files rely on this config to run.

- [ ] **Step 1: Install dependencies**

Run:
```bash
cd frontend
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Create `frontend/vitest.config.ts`**

```ts
import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 3: Create `frontend/vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest"
```

- [ ] **Step 4: Add the `vitest/jsdom` type to `frontend/tsconfig.json`**

In the `compilerOptions` block, add:

```json
"types": ["vitest/jsdom"],
```

(alongside the existing `plugins`/`paths` entries — do not remove them.)

- [ ] **Step 5: Add the `test` script to `frontend/package.json`**

In `"scripts"`, add:

```json
"test": "vitest run",
```

- [ ] **Step 6: Run the full test suite to confirm the setup works**

Run: `cd frontend && pnpm test`
Expected: PASS — this picks up Task 2's `theme-provider.test.tsx` (go back and confirm it now passes, per Task 2 Step 3's note).

- [ ] **Step 7: Commit**

```bash
cd frontend
git add package.json pnpm-lock.yaml vitest.config.ts vitest.setup.ts tsconfig.json
git commit -m "test: configure vitest and react testing library"
```

---

### Task 5: Add the `dropdown-menu` shadcn component

**Files:**
- Create: `frontend/src/components/ui/dropdown-menu.tsx` (generated by shadcn CLI)
- Modify: `frontend/package.json` (shadcn adds any missing registry deps)

**Interfaces:**
- Consumes: nothing (vendored UI primitive).
- Produces: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuItem` exported from `@/components/ui/dropdown-menu`. Task 6's `ThemeToggle` imports these. `DropdownMenuTrigger` takes Base UI's `render` prop for custom trigger elements (not `asChild`); `DropdownMenuItem` accepts a standard `onClick` handler.

- [ ] **Step 1: Add the component via the shadcn CLI**

Run: `cd frontend && npx shadcn@latest add dropdown-menu`

- [ ] **Step 2: Verify the generated file**

Open `frontend/src/components/ui/dropdown-menu.tsx` and confirm it exports at least: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuItem` (it will also export `DropdownMenuLabel`, `DropdownMenuSeparator`, submenu/checkbox/radio variants — leave all of it as generated, don't hand-edit).

- [ ] **Step 3: Build to confirm it compiles**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/components/ui/dropdown-menu.tsx package.json pnpm-lock.yaml
git commit -m "feat: add shadcn dropdown-menu component"
```

---

### Task 6: Build `ThemeToggle`

**Files:**
- Create: `frontend/src/components/theme-toggle.tsx`
- Create: `frontend/src/components/theme-toggle.test.tsx`

**Interfaces:**
- Consumes: `useTheme` from `next-themes` (Task 2's dependency), `Button` from `@/components/ui/button`, `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuGroup`/`DropdownMenuItem` from `@/components/ui/dropdown-menu` (Task 5).
- Produces: `ThemeToggle` component, default export style not used — named export `ThemeToggle` from `@/components/theme-toggle`, rendered with an accessible trigger button labeled "Toggle theme" (`aria-label`) and three menu items with accessible names "Light", "Dark", "System". Task 7's `Header` renders `<ThemeToggle />`. Task 9's e2e test locates the trigger by role `button` name `Toggle theme`, and menu items by role `menuitem`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/theme-toggle.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"

function renderToggle() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeToggle />
    </ThemeProvider>
  )
}

describe("ThemeToggle", () => {
  it("switches to dark theme when 'Dark' is selected", async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole("button", { name: "Toggle theme" }))
    await user.click(await screen.findByRole("menuitem", { name: "Dark" }))

    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("switches to light theme when 'Light' is selected", async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole("button", { name: "Toggle theme" }))
    await user.click(await screen.findByRole("menuitem", { name: "Dark" }))
    await user.click(screen.getByRole("button", { name: "Toggle theme" }))
    await user.click(await screen.findByRole("menuitem", { name: "Light" }))

    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm vitest run src/components/theme-toggle.test.tsx`
Expected: FAIL — `Cannot find module '@/components/theme-toggle'`.

- [ ] **Step 3: Implement `ThemeToggle`**

Create `frontend/src/components/theme-toggle.tsx`:

```tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Toggle theme">
            <Sun data-icon="inline-start" className="dark:hidden" />
            <Moon data-icon="inline-start" className="hidden dark:block" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun data-icon="inline-start" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon data-icon="inline-start" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            System
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm vitest run src/components/theme-toggle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/components/theme-toggle.tsx src/components/theme-toggle.test.tsx
git commit -m "feat: add ThemeToggle component"
```

---

### Task 7: Build `Header` and mount it in the layout

**Files:**
- Create: `frontend/src/components/header.tsx`
- Create: `frontend/src/components/header.test.tsx`
- Modify: `frontend/src/app/layout.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` from `@/components/theme-toggle` (Task 6).
- Produces: `Header` component rendering the text "digital-library" and a `ThemeToggle`. Mounted above `{children}` in `RootLayout`, inside `ThemeProvider` (so `useTheme()` works).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/header.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Header } from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"

describe("Header", () => {
  it("renders the project title and the theme toggle", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Header />
      </ThemeProvider>
    )

    expect(screen.getByText("digital-library")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Toggle theme" })
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && pnpm vitest run src/components/header.test.tsx`
Expected: FAIL — `Cannot find module '@/components/header'`.

- [ ] **Step 3: Implement `Header`**

Create `frontend/src/components/header.tsx`:

```tsx
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <span className="text-sm font-medium">digital-library</span>
      <ThemeToggle />
    </header>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && pnpm vitest run src/components/header.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount `Header` in the root layout**

Modify `frontend/src/app/layout.tsx` — add the import and render `<Header />` as the first child inside `ThemeProvider`, before `{children}`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "digital-library",
  description: "digital-library backend status",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Run the full unit test suite and build**

Run: `cd frontend && pnpm test && pnpm build`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/components/header.tsx src/components/header.test.tsx src/app/layout.tsx
git commit -m "feat: add Header with theme toggle to root layout"
```

---

### Task 8: Configure Playwright

**Files:**
- Create: `frontend/playwright.config.ts`
- Modify: `frontend/package.json` (add `test:e2e` script + devDependency)
- Create: `frontend/e2e/` (directory, populated in Task 9)

**Interfaces:**
- Consumes: nothing (infrastructure task).
- Produces: `pnpm test:e2e` runs Playwright against `frontend/e2e/**`, auto-starting the production build (`pnpm build && pnpm start`) on `http://localhost:3000` before tests run.

- [ ] **Step 1: Install `@playwright/test` and its browser binaries**

Run:
```bash
cd frontend
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 2: Create `frontend/playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

- [ ] **Step 3: Add the `test:e2e` script to `frontend/package.json`**

In `"scripts"`, add:

```json
"test:e2e": "playwright test",
```

- [ ] **Step 4: Commit**

```bash
cd frontend
git add package.json pnpm-lock.yaml playwright.config.ts
git commit -m "test: configure playwright"
```

(`frontend/e2e/` is committed once it has content, in Task 9.)

---

### Task 9: Write the theme-toggle e2e test

**Files:**
- Create: `frontend/e2e/theme-toggle.spec.ts`

**Interfaces:**
- Consumes: the running app (Task 7's `Header`/`ThemeToggle`, Task 8's Playwright config).
- Produces: nothing consumed by later tasks — this is the final verification.

- [ ] **Step 1: Write the e2e test**

Create `frontend/e2e/theme-toggle.spec.ts`:

```ts
import { expect, test } from "@playwright/test"

test.describe("theme toggle", () => {
  test("switches to dark theme and persists after reload", async ({ page }) => {
    await page.goto("/")

    const html = page.locator("html")
    await expect(html).not.toHaveClass(/dark/)

    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.getByRole("menuitem", { name: "Dark" }).click()

    await expect(html).toHaveClass(/dark/)

    await page.reload()

    await expect(html).toHaveClass(/dark/)
  })

  test("switches back to light theme", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.getByRole("menuitem", { name: "Dark" }).click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.getByRole("menuitem", { name: "Light" }).click()
    await expect(page.locator("html")).not.toHaveClass(/dark/)
  })
})
```

- [ ] **Step 2: Run the e2e suite**

Run: `cd frontend && pnpm test:e2e`
Expected: both tests PASS (Playwright will build and start the app automatically per `webServer` config).

- [ ] **Step 3: Commit**

```bash
cd frontend
git add e2e/theme-toggle.spec.ts
git commit -m "test: add e2e coverage for theme toggle"
```

---

### Task 10: Final verification pass

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full unit test suite**

Run: `cd frontend && pnpm test`
Expected: all tests PASS.

- [ ] **Step 2: Run the full e2e suite**

Run: `cd frontend && pnpm test:e2e`
Expected: all tests PASS.

- [ ] **Step 3: Run the production build**

Run: `cd frontend && pnpm build`
Expected: succeeds with no type/lint errors.

- [ ] **Step 4: Manual/browser spot-check**

Start the app (`pnpm dev` or `pnpm start` after `pnpm build`) and, using a browser (Playwright MCP or manual), confirm: the header renders with the toggle, selecting Light/Dark/System visibly changes the Lyra-styled page, and the choice survives a page reload.

- [ ] **Step 5: Update `openspec/changes/frontend-theme-lyra/tasks.md`**

Check off every task in `tasks.md` that corresponds to the work completed in Tasks 1-9 above, so the change's tracked checklist matches reality before running `/opsx:verify` or archiving.

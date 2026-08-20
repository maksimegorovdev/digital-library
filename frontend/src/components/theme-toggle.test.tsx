import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"

function renderToggle() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeToggle />
    </ThemeProvider>
  )
}

afterEach(() => {
  cleanup()
})

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

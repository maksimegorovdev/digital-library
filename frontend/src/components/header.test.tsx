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

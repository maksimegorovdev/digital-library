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

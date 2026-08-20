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

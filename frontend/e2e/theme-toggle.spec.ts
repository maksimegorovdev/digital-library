import { expect, test } from '@playwright/test';

test.describe('theme toggle', () => {
  test('switches to dark theme and persists after reload', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();

    await expect(html).toHaveClass(/dark/);

    await page.reload();

    await expect(html).toHaveClass(/dark/);
  });

  test('switches back to light theme', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'Light' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});

test.describe('theme toggle - system preference (dark)', () => {
  test.use({ colorScheme: 'dark' });

  test("applies dark theme when 'System' is selected under a dark OS preference", async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'System' }).click();

    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});

test.describe('theme toggle - system preference (light)', () => {
  test.use({ colorScheme: 'light' });

  test("applies light theme when 'System' is selected under a light OS preference", async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitem', { name: 'System' }).click();

    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});

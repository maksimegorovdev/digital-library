import { expect, test } from '@playwright/test';

test.describe('books list', () => {
  test('renders seeded books from the backend', async ({ page }) => {
    await page.goto('/books');

    await expect(page.getByText('Dune')).toBeVisible();
    await expect(page.getByText('Frank Herbert')).toBeVisible();
  });
});

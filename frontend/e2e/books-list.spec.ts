import { expect, test } from '@playwright/test';

test.describe('books list', () => {
  test('renders seeded books from the backend', async ({ page }) => {
    await page.goto('/books');

    // Check for page title
    await expect(
      page.getByRole('heading', { name: 'Моя библиотека' }),
    ).toBeVisible();

    // Check for table rows with seeded book data
    await expect(page.getByRole('cell', { name: 'Dune' })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Frank Herbert' }),
    ).toBeVisible();

    // Check for at least one table row
    const rows = await page.getByRole('row').count();
    expect(rows).toBeGreaterThan(0);

    // Check for pagination controls
    await expect(page.getByRole('button', { name: 'Вперёд' })).toBeVisible();
  });
});

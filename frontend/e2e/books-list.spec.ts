import { expect, test } from '@playwright/test';

test.describe('books list', () => {
  test('renders seeded books from the backend', async ({ page }) => {
    await page.goto('/books');

    // Check for page title
    await expect(
      page.getByRole('heading', { name: 'Моя библиотека' }),
    ).toBeVisible();

    // Check for table rows with seeded book data. exact: true avoids
    // matching the cover image's alt text ("Обложка книги «Dune»"),
    // which also contains "Dune" as a substring.
    await expect(
      page.getByRole('cell', { name: 'Dune', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Frank Herbert' }),
    ).toBeVisible();

    // Check for at least one table row
    const rows = await page.getByRole('row').count();
    expect(rows).toBeGreaterThan(0);

    // Check for pagination controls
    await expect(page.getByRole('button', { name: 'Вперёд' })).toBeVisible();
  });

  test('search filter round-trips through the URL and survives a reload', async ({
    page,
  }) => {
    await page.goto('/books');
    await expect(
      page.getByRole('cell', { name: 'Dune', exact: true }),
    ).toBeVisible();

    await page.getByPlaceholder('Поиск по названию или автору').fill('Dune');

    await expect(page).toHaveURL(/search=Dune/);
    await expect(
      page.getByRole('cell', { name: 'Dune', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'The Hobbit', exact: true }),
    ).not.toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/search=Dune/);
    await expect(
      page.getByRole('cell', { name: 'Dune', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'The Hobbit', exact: true }),
    ).not.toBeVisible();
  });
});

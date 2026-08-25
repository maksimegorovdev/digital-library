import { expect, test } from '@playwright/test';

test.describe('books list', () => {
  test('renders seeded books from the backend', async ({ page }) => {
    await page.goto('/');

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
    await page.goto('/');
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

  test('sidebar shows exactly one nav entry, "Библиотека книг"', async ({
    page,
  }) => {
    await page.goto('/');

    const sidebar = page.locator('[data-slot="sidebar"]');

    // Name-scoped: the one entry the spec calls for is present.
    await expect(
      sidebar.getByRole('link', { name: 'Библиотека книг' }),
    ).toHaveCount(1);

    // Count-scoped: catches a second link regardless of its accessible
    // name (e.g. a brand/logo link), which the name-scoped assertion
    // above would miss.
    await expect(sidebar.getByRole('link')).toHaveCount(1);
  });

  test('clicking "Quick Create" in the sidebar opens the same add-book form as "Добавить книгу"', async ({
    page,
  }) => {
    await page.goto('/');

    await page
      .locator('[data-slot="sidebar"]')
      .getByRole('button', { name: 'Quick Create' })
      .click();

    // Same drawer content the toolbar's own button opens: "add" mode
    // (empty fields, no book being edited), not "edit" mode.
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Добавить книгу')).toBeVisible();
    await expect(
      drawer.getByText('Заполните данные новой книги.'),
    ).toBeVisible();
    await expect(page.getByLabel('Название')).toHaveValue('');

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();

    // The toolbar's own button reaches the identical drawer — confirming
    // both entry points converge on one form, not two look-alikes.
    await page.getByRole('button', { name: 'Добавить книгу' }).click();
    await expect(drawer.getByText('Добавить книгу')).toBeVisible();
  });
});

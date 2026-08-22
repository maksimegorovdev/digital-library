import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { BooksDashboard } from '@/components/books/books-dashboard';
import * as api from '@/lib/api';

function book(overrides: Partial<import('@/lib/api').Book> = {}) {
  return {
    id: 1,
    title: 'Dune',
    author: 'Frank Herbert',
    year: 1965,
    genre: 'Sci-Fi',
    coverUrl: null,
    ...overrides,
  };
}

describe('BooksDashboard', () => {
  it('shows a loading state, then renders fetched books', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [book()],
      total: 1,
    });

    render(<BooksDashboard />);

    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
    expect(await screen.findByText('Dune')).toBeInTheDocument();
  });

  it('shows the empty-library message when there are no books', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [],
      total: 0,
    });

    render(<BooksDashboard />);

    expect(
      await screen.findByText('В библиотеке пока нет книг.'),
    ).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: false,
      error: 'network down',
    });

    render(<BooksDashboard />);

    expect(
      await screen.findByText('Не удалось загрузить книги: network down'),
    ).toBeInTheDocument();
  });

  it('refetches with the next page when "Вперёд" is activated', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 20 });

    render(<BooksDashboard />);
    await screen.findByText('Dune');

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Вперёд' }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 }),
    );
  });

  it('resets to page 1 and refetches with the new pageSize when the page-size selector changes', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 20 });

    render(<BooksDashboard />);
    await screen.findByText('Dune');

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    // Move off page 1 first, so the assertion below actually exercises the
    // "resets to page 1" behavior rather than trivially matching page 1.
    await user.click(screen.getByRole('button', { name: 'Вперёд' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 }),
    );

    // The page-size <Select> trigger has no aria-label (unlike the genre
    // filter's), so per ARIA its accessible combobox name is empty rather
    // than derived from its visible text — it can't be targeted by name.
    // It's the second (and last) combobox in the DOM: genre filter first,
    // page-size second.
    const comboboxes = screen.getAllByRole('combobox');
    const pageSizeCombobox = comboboxes[comboboxes.length - 1];
    await user.click(pageSizeCombobox);
    await user.click(
      await screen.findByRole('option', { name: '20 на странице' }),
    );

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 }),
    );
  });
});

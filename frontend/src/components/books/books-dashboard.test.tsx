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
});

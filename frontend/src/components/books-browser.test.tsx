import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BooksBrowser } from '@/components/books-browser';
import * as api from '@/lib/api';
import type { Book } from '@/lib/api';

function book(overrides: Partial<Book> = {}): Book {
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

describe('BooksBrowser', () => {
  it('shows "Load more" and appends the next page when clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [book({ id: 2, title: '1984', author: 'George Orwell' })],
      total: 2,
    });

    render(
      <BooksBrowser
        initialBooks={[book()]}
        total={2}
      />,
    );

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.queryByText('1984')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Показать ещё' }));

    await waitFor(() => expect(screen.getByText('1984')).toBeInTheDocument());
    expect(
      screen.queryByRole('button', { name: 'Показать ещё' }),
    ).not.toBeInTheDocument();
  });

  it('hides "Load more" when all books are already loaded', () => {
    render(
      <BooksBrowser
        initialBooks={[book()]}
        total={1}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Показать ещё' }),
    ).not.toBeInTheDocument();
  });

  it('shows an error message when loading more fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: false,
      error: 'network down',
    });

    render(
      <BooksBrowser
        initialBooks={[book()]}
        total={2}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Показать ещё' }));

    expect(
      await screen.findByText(/Не удалось загрузить ещё книги/),
    ).toBeInTheDocument();
  });
});

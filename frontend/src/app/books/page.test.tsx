import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as api from '@/lib/api';

import BooksPage from './page';

describe('BooksPage', () => {
  it('shows the empty-library message when there are no books', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [],
      total: 0,
    });

    const { container } = render(await BooksPage());

    expect(screen.getByText('В библиотеке пока нет книг.')).toBeInTheDocument();
    expect(container.querySelector('.grid')).not.toBeInTheDocument();
  });

  it('shows an error message when the backend request fails', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: false,
      error: 'network down',
    });

    const { container } = render(await BooksPage());

    expect(
      screen.getByText('Не удалось загрузить книги: network down'),
    ).toBeInTheDocument();
    expect(container.querySelector('.grid')).not.toBeInTheDocument();
  });
});

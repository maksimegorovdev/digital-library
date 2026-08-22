import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DeleteBookDrawer } from '@/components/books/delete-book-drawer';
import * as api from '@/lib/api';

const book = {
  id: 1,
  title: 'Dune',
  author: 'Frank Herbert',
  year: 1965,
  genre: 'Sci-Fi',
  coverUrl: null,
};

describe('DeleteBookDrawer', () => {
  it('asks for confirmation naming the book', () => {
    render(
      <DeleteBookDrawer
        open
        onOpenChange={vi.fn()}
        book={book}
      />,
    );

    expect(
      screen.getByText('Вы уверены, что хотите удалить «Dune»?'),
    ).toBeInTheDocument();
  });

  it('calls deleteBook and closes when "Удалить" is confirmed', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    vi.spyOn(api, 'deleteBook').mockResolvedValue({
      ok: false,
      error: 'not_implemented',
    });

    render(
      <DeleteBookDrawer
        open
        onOpenChange={onOpenChange}
        book={book}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Удалить' }));

    await waitFor(() => expect(api.deleteBook).toHaveBeenCalledWith(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

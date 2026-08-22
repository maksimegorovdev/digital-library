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
        onDeleted={vi.fn()}
        book={book}
      />,
    );

    expect(
      screen.getByText('Вы уверены, что хотите удалить «Dune»?'),
    ).toBeInTheDocument();
  });

  it('calls deleteBook, closes and notifies the caller when confirmed successfully', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onDeleted = vi.fn();
    vi.spyOn(api, 'deleteBook').mockResolvedValue({
      ok: true,
      data: undefined,
    });

    render(
      <DeleteBookDrawer
        open
        onOpenChange={onOpenChange}
        onDeleted={onDeleted}
        book={book}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Удалить' }));

    await waitFor(() => expect(api.deleteBook).toHaveBeenCalledWith(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDeleted).toHaveBeenCalled();
  });

  it('keeps the drawer open and does not notify the caller when deletion fails', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onDeleted = vi.fn();
    vi.spyOn(api, 'deleteBook').mockResolvedValue({
      ok: false,
      error: 'backend responded with 500',
    });

    render(
      <DeleteBookDrawer
        open
        onOpenChange={onOpenChange}
        onDeleted={onDeleted}
        book={book}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Удалить' }));

    await waitFor(() => expect(api.deleteBook).toHaveBeenCalledWith(1));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

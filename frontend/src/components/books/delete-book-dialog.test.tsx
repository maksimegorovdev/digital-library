import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DeleteBookDialog } from '@/components/books/delete-book-dialog';
import * as api from '@/lib/api';

const book = {
  id: 1,
  title: 'Dune',
  author: 'Frank Herbert',
  year: 1965,
  genre: 'Sci-Fi',
  coverUrl: null,
};

describe('DeleteBookDialog', () => {
  it('asks for confirmation naming the book', () => {
    render(
      <DeleteBookDialog
        open
        onOpenChange={vi.fn()}
        onDeleted={vi.fn()}
        book={book}
      />,
    );

    expect(
      screen.getByRole('alertdialog', { name: 'Удалить книгу?' }),
    ).toBeInTheDocument();
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
      <DeleteBookDialog
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

  it('keeps the dialog open and does not notify the caller when deletion fails', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onDeleted = vi.fn();
    vi.spyOn(api, 'deleteBook').mockResolvedValue({
      ok: false,
      error: 'backend responded with 500',
    });

    render(
      <DeleteBookDialog
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

  it('is not dismissed by an outside click', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <DeleteBookDialog
        open
        onOpenChange={onOpenChange}
        onDeleted={vi.fn()}
        book={book}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    // Click the overlay behind the dialog — a plain (non-alert) Dialog would
    // close on this, but AlertDialog must not.
    const overlay = document.querySelector(
      '[data-slot="alert-dialog-overlay"]',
    );
    expect(overlay).not.toBeNull();
    await user.click(overlay as Element);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});

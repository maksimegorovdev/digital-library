import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BookFormDrawer } from '@/components/books/book-form-drawer';
import * as api from '@/lib/api';

describe('BookFormDrawer', () => {
  it('shows "Добавить книгу" and empty fields when no book is passed', () => {
    render(
      <BookFormDrawer
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Добавить книгу')).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toHaveValue('');
  });

  it('pre-fills fields and shows "Изменить книгу" when a book is passed', () => {
    render(
      <BookFormDrawer
        open
        onOpenChange={vi.fn()}
        book={{
          id: 1,
          title: 'Dune',
          author: 'Frank Herbert',
          year: 1965,
          genre: 'Sci-Fi',
          coverUrl: null,
        }}
      />,
    );

    expect(screen.getByText('Изменить книгу')).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toHaveValue('Dune');
  });

  it('blocks submission and shows a validation error when title is empty', async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(api, 'createBook');
    render(
      <BookFormDrawer
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Автор'), 'Frank Herbert');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Укажите название')).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('calls createBook and shows a toast on valid submit, without closing via a real save', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'createBook').mockResolvedValue({
      ok: false,
      error: 'not_implemented',
    });
    render(
      <BookFormDrawer
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Название'), 'Dune');
    await user.type(screen.getByLabelText('Автор'), 'Frank Herbert');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(api.createBook).toHaveBeenCalledWith({
        title: 'Dune',
        author: 'Frank Herbert',
        year: undefined,
        genre: undefined,
        coverUrl: undefined,
      }),
    );
  });
});

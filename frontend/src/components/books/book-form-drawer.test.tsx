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
        onSaved={vi.fn()}
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
        onSaved={vi.fn()}
        book={{
          id: 1,
          title: 'Dune',
          author: 'Frank Herbert',
          year: 1965,
          genre: 'Фантастика',
          coverUrl: null,
        }}
      />,
    );

    expect(screen.getByText('Изменить книгу')).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toHaveValue('Dune');
    expect(screen.getByLabelText('Жанр')).toHaveTextContent('Фантастика');
  });

  it('falls back to "no genre selected" when the book\'s genre is outside the fixed list', () => {
    render(
      <BookFormDrawer
        open
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
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

    expect(screen.getByLabelText('Жанр')).toHaveTextContent('Без жанра');
  });

  it('blocks submission and shows a validation error when title is empty', async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(api, 'createBook');
    render(
      <BookFormDrawer
        open
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Автор'), 'Frank Herbert');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Укажите название')).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('calls createBook, closes and notifies the caller on a successful submit', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();
    vi.spyOn(api, 'createBook').mockResolvedValue({
      ok: true,
      data: {
        id: 1,
        title: 'Dune',
        author: 'Frank Herbert',
        year: null,
        genre: null,
        coverUrl: null,
      },
    });
    render(
      <BookFormDrawer
        open
        onOpenChange={onOpenChange}
        onSaved={onSaved}
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
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSaved).toHaveBeenCalled();
  });

  it('lets the user pick a genre from the fixed list and submits it', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'createBook').mockResolvedValue({
      ok: true,
      data: {
        id: 1,
        title: 'Dune',
        author: 'Frank Herbert',
        year: null,
        genre: 'Фантастика',
        coverUrl: null,
      },
    });
    render(
      <BookFormDrawer
        open
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Название'), 'Dune');
    await user.type(screen.getByLabelText('Автор'), 'Frank Herbert');
    await user.click(screen.getByLabelText('Жанр'));
    await user.click(await screen.findByRole('option', { name: 'Фантастика' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(api.createBook).toHaveBeenCalledWith(
        expect.objectContaining({ genre: 'Фантастика' }),
      ),
    );
  });

  it('keeps the drawer open and does not notify the caller when the save fails', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();
    vi.spyOn(api, 'createBook').mockResolvedValue({
      ok: false,
      error: 'backend responded with 500',
    });
    render(
      <BookFormDrawer
        open
        onOpenChange={onOpenChange}
        onSaved={onSaved}
      />,
    );

    await user.type(screen.getByLabelText('Название'), 'Dune');
    await user.type(screen.getByLabelText('Автор'), 'Frank Herbert');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(api.createBook).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

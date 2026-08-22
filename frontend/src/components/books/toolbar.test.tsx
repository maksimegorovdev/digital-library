import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replaceMock = vi.fn();
let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchParams,
}));

import { BooksToolbar } from '@/components/books/toolbar';

describe('BooksToolbar', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    replaceMock.mockClear();
  });

  it('updates the URL search param when typing in the search field, without calling onAddBook', async () => {
    const user = userEvent.setup();
    render(<BooksToolbar onAddBook={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText('Поиск по названию или автору'),
      'dune',
    );

    expect(replaceMock).toHaveBeenLastCalledWith(
      expect.stringContaining('search=dune'),
      { scroll: false },
    );
  });

  it('updates the URL genre param when a genre is selected', async () => {
    const user = userEvent.setup();
    render(<BooksToolbar onAddBook={vi.fn()} />);

    await user.click(screen.getByRole('combobox', { name: 'Жанр' }));
    await user.click(await screen.findByRole('option', { name: 'Детектив' }));

    expect(replaceMock).toHaveBeenLastCalledWith(
      expect.stringContaining(
        'genre=%D0%94%D0%B5%D1%82%D0%B5%D0%BA%D1%82%D0%B8%D0%B2',
      ),
      { scroll: false },
    );
  });

  it('initializes its controls from existing URL search params', () => {
    searchParams = new URLSearchParams('search=dune&genre=Фантастика');

    render(<BooksToolbar onAddBook={vi.fn()} />);

    expect(
      screen.getByPlaceholderText('Поиск по названию или автору'),
    ).toHaveValue('dune');
    expect(screen.getByText('Фантастика')).toBeInTheDocument();
  });

  it('calls onAddBook when the "Добавить книгу" button is activated', async () => {
    const user = userEvent.setup();
    const onAddBook = vi.fn();
    render(<BooksToolbar onAddBook={onAddBook} />);

    await user.click(screen.getByRole('button', { name: 'Добавить книгу' }));

    expect(onAddBook).toHaveBeenCalledTimes(1);
  });
});

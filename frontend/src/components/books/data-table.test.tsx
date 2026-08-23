import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';

import { BooksDataTable } from '@/components/books/data-table';
import type { Book } from '@/lib/api';

const columns: ColumnDef<Book, unknown>[] = [
  { accessorKey: 'title', header: 'Title' },
];

function makeBook(overrides: Partial<Book>): Book {
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

describe('BooksDataTable', () => {
  it('renders one row per data item', () => {
    render(
      <BooksDataTable
        columns={columns}
        data={[
          makeBook({ id: 1, title: 'Dune' }),
          makeBook({ id: 2, title: '1984' }),
        ]}
        page={1}
        pageSize={10}
        total={2}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        emptyMessage="В библиотеке пока нет книг."
      />,
    );

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('1984')).toBeInTheDocument();
  });

  it('shows the caller-supplied empty message when there are no rows', () => {
    render(
      <BooksDataTable
        columns={columns}
        data={[]}
        page={1}
        pageSize={10}
        total={0}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        emptyMessage="По вашему запросу ничего не найдено."
      />,
    );

    expect(
      screen.getByText('По вашему запросу ничего не найдено.'),
    ).toBeInTheDocument();
  });

  it('disables "Назад" on the first page and "Вперёд" on the last page', () => {
    render(
      <BooksDataTable
        columns={columns}
        data={[makeBook({ id: 1, title: 'Dune' })]}
        page={1}
        pageSize={10}
        total={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        emptyMessage="В библиотеке пока нет книг."
      />,
    );

    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Вперёд' })).toBeDisabled();
  });

  it('calls onPageChange with the next page number', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <BooksDataTable
        columns={columns}
        data={[makeBook({ id: 1, title: 'Dune' })]}
        page={1}
        pageSize={10}
        total={20}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
        emptyMessage="В библиотеке пока нет книг."
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Вперёд' }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

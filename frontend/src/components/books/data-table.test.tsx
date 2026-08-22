import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';

import { BooksDataTable } from '@/components/books/data-table';

type Row = { id: number; name: string };

const columns: ColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }];

describe('BooksDataTable', () => {
  it('renders one row per data item', () => {
    render(
      <BooksDataTable
        columns={columns}
        data={[
          { id: 1, name: 'Dune' },
          { id: 2, name: '1984' },
        ]}
        page={1}
        pageSize={10}
        total={2}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('1984')).toBeInTheDocument();
  });

  it('shows an empty-library message when there are no rows', () => {
    render(
      <BooksDataTable
        columns={columns}
        data={[]}
        page={1}
        pageSize={10}
        total={0}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('В библиотеке пока нет книг.')).toBeInTheDocument();
  });

  it('disables "Назад" on the first page and "Вперёд" on the last page', () => {
    render(
      <BooksDataTable
        columns={columns}
        data={[{ id: 1, name: 'Dune' }]}
        page={1}
        pageSize={10}
        total={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
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
        data={[{ id: 1, name: 'Dune' }]}
        page={1}
        pageSize={10}
        total={20}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Вперёд' }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

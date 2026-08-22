import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createBooksColumns } from '@/components/books/columns';
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

function TestTable({
  data,
  onEdit,
  onDelete,
}: {
  data: Book[];
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}) {
  const table = useReactTable({
    data,
    columns: createBooksColumns({ onEdit, onDelete }),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

describe('createBooksColumns', () => {
  it('renders title, author, year and genre', () => {
    render(
      <TestTable
        data={[book()]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('Frank Herbert')).toBeInTheDocument();
    expect(screen.getByText('1965')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
  });

  it('shows a placeholder instead of a cover image when coverUrl is absent', () => {
    render(
      <TestTable
        data={[book({ coverUrl: null })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Нет')).toBeInTheDocument();
  });

  it('shows em dashes for missing year and genre', () => {
    render(
      <TestTable
        data={[book({ year: null, genre: null })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('calls onEdit when the row menu\'s "Изменить" item is activated', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <TestTable
        data={[book()]}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Действия с книгой' }));
    await user.click(await screen.findByText('Изменить'));

    expect(onEdit).toHaveBeenCalledWith(book());
  });

  it('calls onDelete when the row menu\'s "Удалить" item is activated', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <TestTable
        data={[book()]}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Действия с книгой' }));
    await user.click(await screen.findByText('Удалить'));

    expect(onDelete).toHaveBeenCalledWith(book());
  });
});

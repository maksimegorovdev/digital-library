'use client';

import { MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import { type ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Book } from '@/lib/api';

export function createBooksColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}): ColumnDef<Book>[] {
  return [
    {
      accessorKey: 'coverUrl',
      header: 'Обложка',
      enableSorting: false,
      cell: ({ row }) => {
        const coverUrl = row.original.coverUrl;
        if (!coverUrl) {
          return (
            <div className="bg-muted text-muted-foreground flex h-16 w-11 items-center justify-center rounded text-[10px]">
              Нет
            </div>
          );
        }
        return (
          <Image
            src={coverUrl}
            alt={`Обложка книги «${row.original.title}»`}
            width={44}
            height={64}
            className="h-16 w-11 rounded object-cover"
          />
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Название',
    },
    {
      accessorKey: 'author',
      header: 'Автор',
    },
    {
      accessorKey: 'year',
      header: 'Год',
      cell: ({ row }) => row.original.year ?? '—',
    },
    {
      accessorKey: 'genre',
      header: 'Жанр',
      cell: ({ row }) => row.original.genre ?? '—',
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Действия с книгой"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              Изменить
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(row.original)}
            >
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

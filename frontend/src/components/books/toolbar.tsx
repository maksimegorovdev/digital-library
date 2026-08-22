'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Placeholder options — not sourced from the backend. A follow-up change
// wiring real server-side filtering should replace this with a live list.
export const BOOK_GENRE_OPTIONS = [
  'Фантастика',
  'Фэнтези',
  'Детектив',
  'Роман',
  'Нон-фикшн',
  'Биография',
  'Поэзия',
  'Другое',
] as const;

export function BooksToolbar({ onAddBook }: { onAddBook: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [genre, setGenre] = useState(searchParams.get('genre') ?? '');

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Поиск по названию или автору"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          updateParam('search', event.target.value);
        }}
        className="max-w-xs"
      />
      <Select
        value={genre || undefined}
        onValueChange={(value) => {
          setGenre(value ?? '');
          updateParam('genre', value ?? '');
        }}
      >
        <SelectTrigger
          className="w-40"
          aria-label="Жанр"
        >
          <SelectValue placeholder="Жанр" />
        </SelectTrigger>
        <SelectContent>
          {BOOK_GENRE_OPTIONS.map((option) => (
            <SelectItem
              key={option}
              value={option}
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        className="ml-auto"
        onClick={onAddBook}
      >
        Добавить книгу
      </Button>
    </div>
  );
}

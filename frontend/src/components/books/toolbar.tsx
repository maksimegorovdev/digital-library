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

// Sentinel value for the "clear filter" item. Base UI's Select treats an
// empty-string item value as "no selection" for placeholder purposes, so a
// real, non-empty sentinel is needed to make the clear option selectable.
const ALL_GENRES_VALUE = '__all__';
const ALL_GENRES_LABEL = 'Все жанры';

// Base UI's <Select.Value> only resolves a selected item's display label
// from this `items` list — without it, it falls back to rendering the raw
// value, which would show the "__all__" sentinel verbatim in the trigger.
const GENRE_SELECT_ITEMS = [
  { value: ALL_GENRES_VALUE, label: ALL_GENRES_LABEL },
  ...BOOK_GENRE_OPTIONS.map((option) => ({ value: option, label: option })),
];

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
        items={GENRE_SELECT_ITEMS}
        value={genre || ALL_GENRES_VALUE}
        onValueChange={(value) => {
          const nextGenre = value === ALL_GENRES_VALUE ? '' : (value ?? '');
          setGenre(nextGenre);
          updateParam('genre', nextGenre);
        }}
      >
        <SelectTrigger
          className="w-40"
          aria-label="Жанр"
        >
          <SelectValue placeholder="Жанр" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_GENRES_VALUE}>{ALL_GENRES_LABEL}</SelectItem>
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

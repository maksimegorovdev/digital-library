'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GenreSelect } from '@/components/books/genre-select';

// Sentinel value for the "clear filter" item — see GenreSelect's doc
// comment for why a non-empty sentinel is needed here.
const ALL_GENRES_VALUE = '__all__';
const ALL_GENRES_LABEL = 'Все жанры';

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
      <GenreSelect
        value={genre}
        onValueChange={(nextGenre) => {
          setGenre(nextGenre);
          updateParam('genre', nextGenre);
        }}
        sentinelValue={ALL_GENRES_VALUE}
        sentinelLabel={ALL_GENRES_LABEL}
        ariaLabel="Жанр"
        className="w-40"
      />
      <Button
        className="ml-auto"
        onClick={onAddBook}
      >
        Добавить книгу
      </Button>
    </div>
  );
}

'use client';

import { useState } from 'react';

import { BookCard } from '@/components/book-card';
import { Button } from '@/components/ui/button';
import { BOOKS_PAGE_SIZE, fetchBooks, type Book } from '@/lib/api';

export function BooksBrowser({
  initialBooks,
  total,
}: {
  initialBooks: Book[];
  total: number;
}) {
  const [books, setBooks] = useState(initialBooks);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    setError(null);

    const result = await fetchBooks(books.length, BOOKS_PAGE_SIZE);

    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBooks((prev) => [...prev, ...result.books]);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
          />
        ))}
      </div>
      {books.length < total && (
        <Button
          onClick={loadMore}
          disabled={loading}
          variant="outline"
        >
          {loading ? 'Загрузка…' : 'Показать ещё'}
        </Button>
      )}
      {error && (
        <p className="text-destructive text-sm">
          Не удалось загрузить ещё книги: {error}
        </p>
      )}
    </div>
  );
}

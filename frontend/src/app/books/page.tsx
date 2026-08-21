import { BooksBrowser } from '@/components/books-browser';
import { BOOKS_PAGE_SIZE, fetchBooks } from '@/lib/api';

export default async function BooksPage() {
  const result = await fetchBooks(0, BOOKS_PAGE_SIZE);

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Моя библиотека</h1>
      {!result.ok ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить книги: {result.error}
        </p>
      ) : result.books.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          В библиотеке пока нет книг.
        </p>
      ) : (
        <BooksBrowser
          initialBooks={result.books}
          total={result.total}
        />
      )}
    </main>
  );
}

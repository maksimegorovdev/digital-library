import { Suspense } from 'react';

import { BooksDashboard } from '@/components/books/books-dashboard';

export default function BooksPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <h1 className="text-xl font-semibold">Библиотека Егорова Петра</h1>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Загрузка…</p>}
      >
        <BooksDashboard />
      </Suspense>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';

import { BookFormDrawer } from '@/components/books/book-form-drawer';
import { createBooksColumns } from '@/components/books/columns';
import { BooksDataTable } from '@/components/books/data-table';
import { DeleteBookDrawer } from '@/components/books/delete-book-drawer';
import { BooksToolbar } from '@/components/books/toolbar';
import { DEFAULT_BOOKS_PAGE_SIZE, fetchBooks, type Book } from '@/lib/api';

type FetchSnapshot =
  | { status: 'loading'; page: number; pageSize: number }
  | {
      status: 'success';
      page: number;
      pageSize: number;
      books: Book[];
      total: number;
    }
  | { status: 'error'; page: number; pageSize: number; error: string };

export function BooksDashboard() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_BOOKS_PAGE_SIZE);
  const [snapshot, setSnapshot] = useState<FetchSnapshot>({
    status: 'loading',
    page: 1,
    pageSize: DEFAULT_BOOKS_PAGE_SIZE,
  });
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  // Bumped after a successful create/update/delete to re-run the fetch
  // below without changing the current page or pageSize.
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchBooks({ page, pageSize }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setSnapshot({ status: 'error', page, pageSize, error: result.error });
        return;
      }
      setSnapshot({
        status: 'success',
        page,
        pageSize,
        books: result.books,
        total: result.total,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, refreshToken]);

  const refresh = () => setRefreshToken((token) => token + 1);

  // The fetch snapshot is only trusted once it matches the currently
  // requested page/pageSize — otherwise we're between requests (loading).
  const isCurrent = snapshot.page === page && snapshot.pageSize === pageSize;
  const loading = !isCurrent || snapshot.status === 'loading';
  const error =
    isCurrent && snapshot.status === 'error' ? snapshot.error : null;
  const books =
    isCurrent && snapshot.status === 'success' ? snapshot.books : [];
  const total = isCurrent && snapshot.status === 'success' ? snapshot.total : 0;

  const columns = createBooksColumns({
    onEdit: (book) => {
      setEditingBook(book);
      setFormOpen(true);
    },
    onDelete: (book) => setDeletingBook(book),
  });

  return (
    <div className="flex flex-col gap-4">
      <BooksToolbar
        onAddBook={() => {
          setEditingBook(undefined);
          setFormOpen(true);
        }}
      />
      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : error ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить книги: {error}
        </p>
      ) : (
        <BooksDataTable
          columns={columns}
          data={books}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
      <BookFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        book={editingBook}
        onSaved={refresh}
      />
      <DeleteBookDrawer
        open={deletingBook !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingBook(null);
        }}
        book={deletingBook}
        onDeleted={refresh}
      />
    </div>
  );
}

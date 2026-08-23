'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BookFormDrawer } from '@/components/books/book-form-drawer';
import { createBooksColumns } from '@/components/books/columns';
import { BooksDataTable } from '@/components/books/data-table';
import { DeleteBookDrawer } from '@/components/books/delete-book-drawer';
import { BooksToolbar } from '@/components/books/toolbar';
import { DEFAULT_BOOKS_PAGE_SIZE, fetchBooks, type Book } from '@/lib/api';

// How long a keystroke in the search box waits before it affects the
// fetch — long enough to not fire a request per keystroke, short enough
// to feel responsive. Genre changes are a discrete selection and skip
// this delay entirely.
const SEARCH_DEBOUNCE_MS = 300;

type Filter = { search: string; genre: string };

type FetchSnapshot =
  | ({ status: 'loading' } & Filter & { page: number; pageSize: number })
  | ({ status: 'success' } & Filter & {
        page: number;
        pageSize: number;
        books: Book[];
        total: number;
      })
  | ({ status: 'error' } & Filter & {
        page: number;
        pageSize: number;
        error: string;
      });

export function BooksDashboard() {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const genre = searchParams.get('genre') ?? '';

  // The search box's URL param updates on every keystroke; debounce it
  // here so a burst of typing doesn't fire a fetch per character. Genre
  // is a discrete selection and is used as-is.
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [search]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_BOOKS_PAGE_SIZE);

  // Reset to page 1 whenever the effective filter changes, following
  // React's "adjust state during render" pattern so the reset lands in
  // the same render as the filter change instead of firing an extra,
  // now-stale fetch first. See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [appliedFilter, setAppliedFilter] = useState<Filter>({
    search: debouncedSearch,
    genre,
  });
  if (
    appliedFilter.search !== debouncedSearch ||
    appliedFilter.genre !== genre
  ) {
    setAppliedFilter({ search: debouncedSearch, genre });
    setPage(1);
  }

  const [snapshot, setSnapshot] = useState<FetchSnapshot>({
    status: 'loading',
    page: 1,
    pageSize: DEFAULT_BOOKS_PAGE_SIZE,
    search: '',
    genre: '',
  });
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  // Bumped after a successful create/update/delete to re-run the fetch
  // below without changing the current page, pageSize, or filter.
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchBooks({
      page,
      pageSize,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(genre ? { genre } : {}),
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setSnapshot({
          status: 'error',
          page,
          pageSize,
          search: debouncedSearch,
          genre,
          error: result.error,
        });
        return;
      }
      setSnapshot({
        status: 'success',
        page,
        pageSize,
        search: debouncedSearch,
        genre,
        books: result.books,
        total: result.total,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, genre, refreshToken]);

  const refresh = () => setRefreshToken((token) => token + 1);

  // The fetch snapshot is only trusted once it matches the currently
  // requested page/pageSize/filter — otherwise we're between requests
  // (loading) or looking at a response for a filter that no longer applies.
  const isCurrent =
    snapshot.page === page &&
    snapshot.pageSize === pageSize &&
    snapshot.search === debouncedSearch &&
    snapshot.genre === genre;
  const loading = !isCurrent || snapshot.status === 'loading';
  const error =
    isCurrent && snapshot.status === 'error' ? snapshot.error : null;
  const books =
    isCurrent && snapshot.status === 'success' ? snapshot.books : [];
  const total = isCurrent && snapshot.status === 'success' ? snapshot.total : 0;
  const emptyMessage =
    debouncedSearch || genre
      ? 'По вашему запросу ничего не найдено.'
      : 'В библиотеке пока нет книг.';

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
          emptyMessage={emptyMessage}
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

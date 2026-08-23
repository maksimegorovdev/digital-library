import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => searchParams,
}));

import { BooksDashboard } from '@/components/books/books-dashboard';
import * as api from '@/lib/api';

function book(overrides: Partial<import('@/lib/api').Book> = {}) {
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

describe('BooksDashboard', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
  });

  it('shows a loading state, then renders fetched books', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [book()],
      total: 1,
    });

    render(<BooksDashboard />);

    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
    expect(await screen.findByText('Dune')).toBeInTheDocument();
  });

  it('shows the empty-library message when there are no books', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [],
      total: 0,
    });

    render(<BooksDashboard />);

    expect(
      await screen.findByText('В библиотеке пока нет книг.'),
    ).toBeInTheDocument();
  });

  it('shows a distinct no-results message when a filter is active and matches nothing', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [],
      total: 0,
    });

    searchParams = new URLSearchParams('search=nonexistent');
    render(<BooksDashboard />);

    expect(
      await screen.findByText('По вашему запросу ничего не найдено.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('В библиотеке пока нет книг.'),
    ).not.toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: false,
      error: 'network down',
    });

    render(<BooksDashboard />);

    expect(
      await screen.findByText('Не удалось загрузить книги: network down'),
    ).toBeInTheDocument();
  });

  it('refetches with the next page when "Вперёд" is activated', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 20 });

    render(<BooksDashboard />);
    await screen.findByText('Dune');

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Вперёд' }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 }),
    );
  });

  it('resets to page 1 and refetches with the new pageSize when the page-size selector changes', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 20 });

    render(<BooksDashboard />);
    await screen.findByText('Dune');

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    // Move off page 1 first, so the assertion below actually exercises the
    // "resets to page 1" behavior rather than trivially matching page 1.
    await user.click(screen.getByRole('button', { name: 'Вперёд' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 }),
    );

    // The page-size <Select> trigger has no aria-label (unlike the genre
    // filter's), so per ARIA its accessible combobox name is empty rather
    // than derived from its visible text — it can't be targeted by name.
    // It's the second (and last) combobox in the DOM: genre filter first,
    // page-size second.
    const comboboxes = screen.getAllByRole('combobox');
    const pageSizeCombobox = comboboxes[comboboxes.length - 1];
    await user.click(pageSizeCombobox);
    await user.click(
      await screen.findByRole('option', { name: '20 на странице' }),
    );

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 }),
    );
  });

  it('refetches the current page after a book is successfully saved', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 1 });
    vi.spyOn(api, 'createBook').mockResolvedValue({
      ok: true,
      data: book({ id: 2, title: 'New Book' }),
    });

    render(<BooksDashboard />);
    await screen.findByText('Dune');
    const callsBeforeSave = fetchSpy.mock.calls.length;

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Добавить книгу' }));
    await user.type(screen.getByLabelText('Название'), 'New Book');
    await user.type(screen.getByLabelText('Автор'), 'Someone');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBeforeSave),
    );
  });

  it('includes the genre from the URL in the fetch immediately, without debouncing', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 1 });

    searchParams = new URLSearchParams('genre=Fantasy');
    const { rerender } = render(<BooksDashboard />);
    rerender(<BooksDashboard />);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        genre: 'Fantasy',
      }),
    );
  });

  it('debounces the search term from the URL before it reaches the fetch', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 1 });

    const { rerender } = render(<BooksDashboard />);
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 }),
    );
    const callsBeforeSearch = fetchSpy.mock.calls.length;

    searchParams = new URLSearchParams('search=dune');
    rerender(<BooksDashboard />);

    // Immediately after the URL changes, the debounce window hasn't
    // elapsed yet, so no new fetch has fired.
    expect(fetchSpy.mock.calls.length).toBe(callsBeforeSearch);

    await waitFor(
      () =>
        expect(fetchSpy).toHaveBeenLastCalledWith({
          page: 1,
          pageSize: 10,
          search: 'dune',
        }),
      { timeout: 1000 },
    );
  });

  it('resets to page 1 when the genre filter changes off of a later page', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 40 });

    const { rerender } = render(<BooksDashboard />);
    await screen.findByText('Dune');

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Вперёд' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 }),
    );

    searchParams = new URLSearchParams('genre=Fantasy');
    rerender(<BooksDashboard />);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        genre: 'Fantasy',
      }),
    );
    // The reset lands directly on the filtered fetch — no intermediate
    // request for the stale page/filter combination.
    expect(fetchSpy).not.toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      genre: 'Fantasy',
    });
  });

  it('combines search and genre in the same fetch', async () => {
    const fetchSpy = vi
      .spyOn(api, 'fetchBooks')
      .mockResolvedValue({ ok: true, books: [book()], total: 1 });

    searchParams = new URLSearchParams('search=dune&genre=Fantasy');
    const { rerender } = render(<BooksDashboard />);
    rerender(<BooksDashboard />);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        search: 'dune',
        genre: 'Fantasy',
      }),
    );
  });
});

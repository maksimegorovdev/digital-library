import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBook, deleteBook, fetchBooks, updateBook } from '@/lib/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchBooks', () => {
  it('returns books and total on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            books: [
              {
                id: 1,
                title: 'Dune',
                author: 'Frank Herbert',
                year: 1965,
                genre: 'Sci-Fi',
                coverUrl: null,
              },
            ],
            total: 1,
          }),
      }),
    );

    const result = await fetchBooks({ page: 1, pageSize: 10 });

    expect(result).toEqual({
      ok: true,
      books: [
        {
          id: 1,
          title: 'Dune',
          author: 'Frank Herbert',
          year: 1965,
          genre: 'Sci-Fi',
          coverUrl: null,
        },
      ],
      total: 1,
    });
  });

  it('returns an empty list when the library has no books', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ books: [], total: 0 }),
      }),
    );

    const result = await fetchBooks({ page: 1, pageSize: 10 });

    expect(result).toEqual({ ok: true, books: [], total: 0 });
  });

  it('returns an error when the backend responds with a non-200 status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const result = await fetchBooks({ page: 1, pageSize: 10 });

    expect(result).toEqual({ ok: false, error: 'backend responded with 500' });
  });

  it('returns an error when the network request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    const result = await fetchBooks({ page: 1, pageSize: 10 });

    expect(result).toEqual({ ok: false, error: 'network down' });
  });

  it('translates page and pageSize into limit and offset', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchBooks({ page: 3, pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/books?limit=10&offset=20'),
      expect.any(Object),
    );
  });

  it('defaults to the first page at the default page size when called without arguments', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchBooks();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/books?limit=10&offset=0'),
      expect.any(Object),
    );
  });

  it('includes search and genre as query parameters when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchBooks({
      page: 1,
      pageSize: 10,
      search: 'dune',
      genre: 'Sci-Fi',
    });

    const [url] = fetchMock.mock.calls[0] as [string, unknown];
    expect(url).toContain('search=dune');
    expect(url).toContain(`genre=${encodeURIComponent('Sci-Fi')}`);
  });

  it('omits search and genre when they are empty strings', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchBooks({ page: 1, pageSize: 10, search: '', genre: '' });

    const [url] = fetchMock.mock.calls[0] as [string, unknown];
    expect(url).not.toContain('search');
    expect(url).not.toContain('genre');
  });

  it("returns the backend response body's effective page size", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ books: [], total: 0, limit: 10 }),
      }),
    );

    const result = await fetchBooks({ page: 1, pageSize: 10 });

    expect(result).toEqual({ ok: true, books: [], total: 0, pageSize: 10 });
  });

  it('returns an effective page size smaller than requested when the backend clamps it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ books: [], total: 0, limit: 200 }),
      }),
    );

    const result = await fetchBooks({ page: 1, pageSize: 500 });

    expect(result).toEqual({ ok: true, books: [], total: 0, pageSize: 200 });
  });
});

describe('createBook', () => {
  it('sends a POST to /books with all optional fields explicit, and returns the created book', async () => {
    const created = {
      id: 1,
      title: 'Dune',
      author: 'Frank Herbert',
      year: null,
      genre: null,
      coverUrl: null,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(created),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await createBook({ title: 'Dune', author: 'Frank Herbert' });

    expect(result).toEqual({ ok: true, data: created });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/books');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      title: 'Dune',
      author: 'Frank Herbert',
      year: null,
      genre: null,
      coverUrl: null,
    });
  });

  it('returns the backend error message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'title is required' }),
      }),
    );

    const result = await createBook({ title: '', author: 'Frank Herbert' });

    expect(result).toEqual({ ok: false, error: 'title is required' });
  });

  it('falls back to a generic message when the error response has no body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('no body')),
      }),
    );

    const result = await createBook({ title: 'Dune', author: 'Frank Herbert' });

    expect(result).toEqual({ ok: false, error: 'backend responded with 500' });
  });

  it('returns an error when the network request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    const result = await createBook({ title: 'Dune', author: 'Frank Herbert' });

    expect(result).toEqual({ ok: false, error: 'network down' });
  });
});

describe('updateBook', () => {
  it('sends a PATCH to /books/:id and returns the updated book', async () => {
    const updated = {
      id: 1,
      title: 'Dune',
      author: 'Frank Herbert',
      year: 1965,
      genre: null,
      coverUrl: null,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updated),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await updateBook(1, {
      title: 'Dune',
      author: 'Frank Herbert',
      year: 1965,
    });

    expect(result).toEqual({ ok: true, data: updated });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/books/1');
    expect(init.method).toBe('PATCH');
  });

  it('returns the backend error message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'book not found' }),
      }),
    );

    const result = await updateBook(999, { title: 'X', author: 'Y' });

    expect(result).toEqual({ ok: false, error: 'book not found' });
  });
});

describe('deleteBook', () => {
  it('sends a DELETE to /books/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);

    const result = await deleteBook(1);

    expect(result).toEqual({ ok: true, data: undefined });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/books/1');
    expect(init.method).toBe('DELETE');
  });

  it('returns the backend error message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'book not found' }),
      }),
    );

    const result = await deleteBook(999);

    expect(result).toEqual({ ok: false, error: 'book not found' });
  });
});

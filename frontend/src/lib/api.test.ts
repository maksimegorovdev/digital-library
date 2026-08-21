import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchBooks } from '@/lib/api';

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

    const result = await fetchBooks();

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

    const result = await fetchBooks();

    expect(result).toEqual({ ok: true, books: [], total: 0 });
  });

  it('returns an error when the backend responds with a non-200 status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const result = await fetchBooks();

    expect(result).toEqual({ ok: false, error: 'backend responded with 500' });
  });

  it('returns an error when the network request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    const result = await fetchBooks();

    expect(result).toEqual({ ok: false, error: 'network down' });
  });

  it('requests the given offset and limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchBooks(20, 10);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/books?limit=10&offset=20'),
      expect.any(Object),
    );
  });
});

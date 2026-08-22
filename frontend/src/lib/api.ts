const DEFAULT_API_BASE_URL = 'http://localhost:8080';

/**
 * Returns the backend's base URL from NEXT_PUBLIC_API_URL, falling back
 * to the local dev default when unset.
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
}

export type HealthStatus =
  { ok: true; status: string } | { ok: false; error: string };

/**
 * Fetches the backend's /healthz endpoint and normalizes both network
 * failures and non-200 responses into a HealthStatus the UI can render
 * without throwing.
 */
export async function fetchHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/healthz`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: `backend responded with ${res.status}` };
    }
    const body = (await res.json()) as { status: string };
    return { ok: true, status: body.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

export const DEFAULT_BOOKS_PAGE_SIZE = 10;
export const BOOKS_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type Book = {
  id: number;
  title: string;
  author: string;
  year: number | null;
  genre: string | null;
  coverUrl: string | null;
};

export type BooksQuery = {
  page: number;
  pageSize: number;
  search?: string;
  genre?: string;
};

export type BooksResult =
  { ok: true; books: Book[]; total: number } | { ok: false; error: string };

/**
 * Fetches a page of books from the backend's /books endpoint and
 * normalizes both network failures and non-200 responses into a
 * BooksResult the UI can render without throwing. `search`/`genre` on
 * BooksQuery are accepted for forward-compatibility with server-side
 * filtering but are intentionally not sent yet.
 */
export async function fetchBooks(
  query: BooksQuery = { page: 1, pageSize: DEFAULT_BOOKS_PAGE_SIZE },
): Promise<BooksResult> {
  const { page, pageSize } = query;
  const offset = (page - 1) * pageSize;
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/books?limit=${pageSize}&offset=${offset}`,
      { cache: 'no-store', signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) {
      return { ok: false, error: `backend responded with ${res.status}` };
    }
    const body = (await res.json()) as { books: Book[]; total: number };
    return { ok: true, books: body.books ?? [], total: body.total };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

export type BookInput = {
  title: string;
  author: string;
  year?: number;
  genre?: string;
  coverUrl?: string;
};

export type MutationResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string };

/**
 * Serializes a BookInput for the wire. Absent optional fields are sent as
 * explicit `null` rather than omitted: create/update treat the request
 * body as the book's complete state, so a missing key would be
 * indistinguishable from "leave unchanged" instead of "clear this field".
 */
function bookInputBody(input: BookInput) {
  return {
    title: input.title,
    author: input.author,
    year: input.year ?? null,
    genre: input.genre ?? null,
    coverUrl: input.coverUrl ?? null,
  };
}

/**
 * Reads the {"error": string} body the backend sends on a non-2xx mutation
 * response, falling back to a generic status-based message if the body is
 * missing or malformed.
 */
async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // No JSON body (or it didn't parse) — fall through to the generic
    // message below.
  }
  return `backend responded with ${res.status}`;
}

/**
 * Creates a book via POST /books and returns it with its generated ID.
 */
export async function createBook(
  input: BookInput,
): Promise<MutationResult<Book>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookInputBody(input)),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: await parseErrorMessage(res) };
    }
    return { ok: true, data: (await res.json()) as Book };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

/**
 * Replaces a book via PATCH /books/:id and returns the updated book.
 */
export async function updateBook(
  id: number,
  input: BookInput,
): Promise<MutationResult<Book>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookInputBody(input)),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: await parseErrorMessage(res) };
    }
    return { ok: true, data: (await res.json()) as Book };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

/**
 * Deletes a book via DELETE /books/:id.
 */
export async function deleteBook(id: number): Promise<MutationResult> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/books/${id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: await parseErrorMessage(res) };
    }
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

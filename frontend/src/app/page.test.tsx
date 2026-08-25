import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import BooksPage from '@/app/page';
import { QuickCreateProvider } from '@/components/quick-create-provider';
import * as api from '@/lib/api';

describe('BooksPage', () => {
  it('renders the page title and the dashboard', async () => {
    vi.spyOn(api, 'fetchBooks').mockResolvedValue({
      ok: true,
      books: [],
      total: 0,
      pageSize: 10,
    });

    render(
      <QuickCreateProvider>
        <BooksPage />
      </QuickCreateProvider>,
    );

    expect(screen.getByText('Библиотека Егорова Петра')).toBeInTheDocument();
    expect(
      await screen.findByText('В библиотеке пока нет книг.'),
    ).toBeInTheDocument();
  });
});

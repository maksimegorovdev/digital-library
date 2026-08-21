import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BookCard } from '@/components/book-card';
import type { Book } from '@/lib/api';

function book(overrides: Partial<Book> = {}): Book {
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

describe('BookCard', () => {
  it('renders title, author, year and genre', () => {
    render(<BookCard book={book()} />);

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('Frank Herbert')).toBeInTheDocument();
    expect(screen.getByText('1965 · Sci-Fi')).toBeInTheDocument();
  });

  it('shows a placeholder instead of an image when coverUrl is absent', () => {
    render(<BookCard book={book({ coverUrl: null })} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Нет обложки')).toBeInTheDocument();
  });

  it('renders an image when coverUrl is present', () => {
    render(
      <BookCard
        book={book({ coverUrl: 'https://picsum.photos/seed/dune/300/450' })}
      />,
    );

    expect(screen.getByRole('img', { name: 'Dune cover' })).toBeInTheDocument();
  });

  it('omits the year/genre line when both are absent', () => {
    render(<BookCard book={book({ year: null, genre: null })} />);

    expect(screen.queryByText('1965 · Sci-Fi')).not.toBeInTheDocument();
  });
});

import Image from 'next/image';

import { Card, CardContent } from '@/components/ui/card';
import type { Book } from '@/lib/api';

export function BookCard({ book }: { book: Book }) {
  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-muted relative aspect-[2/3] w-full">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={`${book.title} cover`}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
            Нет обложки
          </div>
        )}
      </div>
      <CardContent className="space-y-1 py-3">
        <p className="truncate text-sm font-medium">{book.title}</p>
        <p className="text-muted-foreground truncate text-xs">{book.author}</p>
        {(book.year || book.genre) && (
          <p className="text-muted-foreground truncate text-xs">
            {[book.year, book.genre].filter(Boolean).join(' · ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

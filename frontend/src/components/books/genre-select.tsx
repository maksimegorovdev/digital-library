'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BOOK_GENRE_OPTIONS } from '@/lib/genres';

/**
 * A `<Select>` over the fixed genre vocabulary, shared by the books
 * toolbar's filter and the book create/edit form. Both callers need an
 * empty-string value to mean "no genre" (no filter / no genre set) but
 * Base UI's Select treats an empty-string item value as "no selection" for
 * placeholder purposes, so each caller supplies its own non-empty sentinel
 * (and label) for that state — "Все жанры" to clear the filter, "Без
 * жанра" to leave a book's genre unset.
 */
export function GenreSelect({
  value,
  onValueChange,
  sentinelValue,
  sentinelLabel,
  ariaLabel,
  id,
  className,
  ariaInvalid,
}: {
  value: string;
  onValueChange: (value: string) => void;
  sentinelValue: string;
  sentinelLabel: string;
  ariaLabel: string;
  id?: string;
  className?: string;
  ariaInvalid?: boolean;
}) {
  // Base UI's <Select.Value> only resolves a selected item's display label
  // from this `items` list — without it, it falls back to rendering the raw
  // value, which would show the sentinel verbatim in the trigger.
  const items = [
    { value: sentinelValue, label: sentinelLabel },
    ...BOOK_GENRE_OPTIONS.map((option) => ({ value: option, label: option })),
  ];

  return (
    <Select
      items={items}
      value={value || sentinelValue}
      onValueChange={(next) =>
        onValueChange(next === sentinelValue ? '' : (next ?? ''))
      }
    >
      <SelectTrigger
        id={id}
        className={className}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
      >
        <SelectValue placeholder={ariaLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={sentinelValue}>{sentinelLabel}</SelectItem>
        {BOOK_GENRE_OPTIONS.map((option) => (
          <SelectItem
            key={option}
            value={option}
          >
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Fixed list, not sourced from the backend — intentional for now (see the
// search/genre filtering spec's Out of Scope section). Shared by the books
// toolbar's filter and the book create/edit form so a book saved under a
// given genre is always findable later by filtering on it.
export const BOOK_GENRE_OPTIONS = [
  'Фантастика',
  'Фэнтези',
  'Детектив',
  'Роман',
  'Нон-фикшн',
  'Биография',
  'Поэзия',
  'Другое',
] as const;

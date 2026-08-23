'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GenreSelect } from '@/components/books/genre-select';
import { createBook, updateBook, type Book, type BookInput } from '@/lib/api';
import { BOOK_GENRE_OPTIONS } from '@/lib/genres';

// Sentinel for "no genre selected" — see GenreSelect's doc comment for why
// a non-empty sentinel is needed here.
const NO_GENRE_VALUE = '__none__';
const NO_GENRE_LABEL = 'Без жанра';

const bookFormSchema = z.object({
  title: z.string().min(1, 'Укажите название'),
  author: z.string().min(1, 'Укажите автора'),
  year: z.string(),
  genre: z.union([z.literal(''), z.enum(BOOK_GENRE_OPTIONS)]),
  coverUrl: z.string(),
});

type BookFormValues = z.infer<typeof bookFormSchema>;

// A book's stored genre may predate the fixed vocabulary (or have been
// written some other way), so it isn't guaranteed to be one of
// BOOK_GENRE_OPTIONS. Such a value is treated as "no genre selected" rather
// than rejected, since the form's select can only offer the fixed list.
function isBookGenreOption(
  value: string | null | undefined,
): value is (typeof BOOK_GENRE_OPTIONS)[number] {
  return (
    typeof value === 'string' &&
    (BOOK_GENRE_OPTIONS as readonly string[]).includes(value)
  );
}

function toDefaultValues(book?: Book): BookFormValues {
  return {
    title: book?.title ?? '',
    author: book?.author ?? '',
    year: book?.year ? String(book.year) : '',
    genre: isBookGenreOption(book?.genre) ? book.genre : '',
    coverUrl: book?.coverUrl ?? '',
  };
}

export function BookFormDrawer({
  open,
  onOpenChange,
  book,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book;
  onSaved: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    values: toDefaultValues(book),
  });

  async function onSubmit(values: BookFormValues) {
    const input: BookInput = {
      title: values.title,
      author: values.author,
      year: values.year ? Number(values.year) : undefined,
      genre: values.genre || undefined,
      coverUrl: values.coverUrl || undefined,
    };

    const result = book
      ? await updateBook(book.id, input)
      : await createBook(input);

    if (!result.ok) {
      toast.error('Не удалось сохранить книгу', {
        description: result.error,
      });
      return;
    }

    toast.success(book ? 'Книга обновлена' : 'Книга добавлена');
    onOpenChange(false);
    onSaved();
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {book ? 'Изменить книгу' : 'Добавить книгу'}
          </DrawerTitle>
          <DrawerDescription>
            {book ? 'Обновите данные книги.' : 'Заполните данные новой книги.'}
          </DrawerDescription>
        </DrawerHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="px-4"
        >
          <FieldGroup>
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="book-title">Название</FieldLabel>
              <FieldContent>
                <Input
                  id="book-title"
                  aria-invalid={!!errors.title}
                  {...register('title')}
                />
                <FieldError errors={[errors.title]} />
              </FieldContent>
            </Field>
            <Field data-invalid={!!errors.author}>
              <FieldLabel htmlFor="book-author">Автор</FieldLabel>
              <FieldContent>
                <Input
                  id="book-author"
                  aria-invalid={!!errors.author}
                  {...register('author')}
                />
                <FieldError errors={[errors.author]} />
              </FieldContent>
            </Field>
            <Field data-invalid={!!errors.year}>
              <FieldLabel htmlFor="book-year">Год</FieldLabel>
              <FieldContent>
                <Input
                  id="book-year"
                  type="number"
                  aria-invalid={!!errors.year}
                  {...register('year')}
                />
                <FieldError errors={[errors.year]} />
              </FieldContent>
            </Field>
            <Field data-invalid={!!errors.genre}>
              <FieldLabel htmlFor="book-genre">Жанр</FieldLabel>
              <FieldContent>
                <Controller
                  control={control}
                  name="genre"
                  render={({ field }) => (
                    <GenreSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      sentinelValue={NO_GENRE_VALUE}
                      sentinelLabel={NO_GENRE_LABEL}
                      ariaLabel="Жанр"
                      id="book-genre"
                      ariaInvalid={!!errors.genre}
                    />
                  )}
                />
                <FieldError errors={[errors.genre]} />
              </FieldContent>
            </Field>
            <Field data-invalid={!!errors.coverUrl}>
              <FieldLabel htmlFor="book-cover-url">
                Ссылка на обложку
              </FieldLabel>
              <FieldContent>
                <Input
                  id="book-cover-url"
                  aria-invalid={!!errors.coverUrl}
                  {...register('coverUrl')}
                />
                <FieldError errors={[errors.coverUrl]} />
              </FieldContent>
            </Field>
          </FieldGroup>
          <DrawerFooter className="px-0">
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              Сохранить
            </Button>
            <DrawerClose render={<Button variant="outline">Отмена</Button>} />
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

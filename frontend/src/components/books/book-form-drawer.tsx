'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { createBook, updateBook, type Book, type BookInput } from '@/lib/api';

const bookFormSchema = z.object({
  title: z.string().min(1, 'Укажите название'),
  author: z.string().min(1, 'Укажите автора'),
  year: z.string(),
  genre: z.string(),
  coverUrl: z.string(),
});

type BookFormValues = z.infer<typeof bookFormSchema>;

function toDefaultValues(book?: Book): BookFormValues {
  return {
    title: book?.title ?? '',
    author: book?.author ?? '',
    year: book?.year ? String(book.year) : '',
    genre: book?.genre ?? '',
    coverUrl: book?.coverUrl ?? '',
  };
}

export function BookFormDrawer({
  open,
  onOpenChange,
  book,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
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

    await (book ? updateBook(book.id, input) : createBook(input));

    toast('Функция скоро появится', {
      description: 'Сохранение книг пока не подключено к серверу.',
    });
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
                <Input
                  id="book-genre"
                  aria-invalid={!!errors.genre}
                  {...register('genre')}
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
            <Button type="submit">Сохранить</Button>
            <DrawerClose render={<Button variant="outline">Отмена</Button>} />
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

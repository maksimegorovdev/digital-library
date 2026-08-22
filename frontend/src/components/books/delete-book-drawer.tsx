'use client';

import { toast } from 'sonner';

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
import { deleteBook, type Book } from '@/lib/api';

export function DeleteBookDrawer({
  open,
  onOpenChange,
  book,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book | null;
}) {
  async function handleConfirm() {
    if (!book) return;
    await deleteBook(book.id);
    toast('Функция скоро появится', {
      description: 'Удаление книг пока не подключено к серверу.',
    });
    onOpenChange(false);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Удалить книгу?</DrawerTitle>
          <DrawerDescription>
            {book ? `Вы уверены, что хотите удалить «${book.title}»?` : ''}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button
            variant="destructive"
            onClick={handleConfirm}
          >
            Удалить
          </Button>
          <DrawerClose render={<Button variant="outline">Отмена</Button>} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

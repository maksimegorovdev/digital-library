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
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book | null;
  onDeleted: () => void;
}) {
  async function handleConfirm() {
    if (!book) return;

    const result = await deleteBook(book.id);
    if (!result.ok) {
      toast.error('Не удалось удалить книгу', { description: result.error });
      return;
    }

    toast.success('Книга удалена');
    onOpenChange(false);
    onDeleted();
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

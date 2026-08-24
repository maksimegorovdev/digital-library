'use client';

import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteBook, type Book } from '@/lib/api';

export function DeleteBookDialog({
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
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить книгу?</AlertDialogTitle>
          <AlertDialogDescription>
            {book ? `Вы уверены, что хотите удалить «${book.title}»?` : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
          >
            Удалить
          </AlertDialogAction>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

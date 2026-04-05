"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName = "data ini",
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent 
        className="rounded-2xl shadow-lg p-6 sm:p-8"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold tracking-tight text-destructive flex items-center gap-2">
            Konfirmasi Hapus
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-base leading-relaxed pt-2">
            Apakah Anda yakin ingin menghapus <strong className="text-foreground">{itemName}</strong>? 
            <br />
            Tindakan ini bersifat permanen dan data yang dihapus tidak dapat dikembalikan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-8 gap-3 sm:gap-2">
          <AlertDialogCancel 
            variant="outline" 
            className="px-8 h-11 font-semibold border-muted-foreground/20 hover:bg-muted/50"
          >
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="px-8 h-11 font-semibold transition-all active:scale-95"
            onClick={onConfirm}
          >
            Hapus Permanen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

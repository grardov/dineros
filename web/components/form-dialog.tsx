"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";

// Shared shell for the create/edit dialogs. onSubmit returns an error message to keep it open.
export function FormDialog({
  open,
  onClose,
  title,
  onSubmit,
  onDelete,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (data: FormData) => string | null;
  onDelete?: () => string | null;
  children: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    setError(null);
    onClose();
  };
  const run = (fn: () => string | null) => {
    const err = fn();
    if (err) setError(err);
    else close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => onSubmit(new FormData(e.currentTarget)));
          }}
          className="flex flex-col gap-4"
        >
          <FieldGroup className="gap-4">{children}</FieldGroup>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            {onDelete && (
              <AlertDialog open={confirming} onOpenChange={setConfirming}>
                <AlertDialogTrigger
                  render={<Button type="button" variant="destructive" className="sm:mr-auto" />}
                >
                  Eliminar
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => {
                        setConfirming(false);
                        run(onDelete);
                      }}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// FormData helpers: empty inputs become null.
export const text = (d: FormData, key: string) => String(d.get(key) ?? "").trim() || null;
export const num = (d: FormData, key: string) => {
  const v = text(d, key);
  return v === null ? null : Number(v);
};

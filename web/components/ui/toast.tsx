"use client";

import { Toast } from "@base-ui/react/toast";
import { CircleAlertIcon, CircleCheckIcon, XIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

// One manager for the whole app, so anything (event handlers, effects) can call toast.add().
// type: "success" | "error" picks the icon; actionProps adds a button (see NewVersion).
export const toast = Toast.createToastManager();

function Toasts() {
  return Toast.useToastManager().toasts.map((t) => (
    <Toast.Root
      key={t.id}
      toast={t}
      swipeDirection={["up", "right"]}
      className="pointer-events-auto flex w-full translate-x-(--toast-swipe-movement-x) translate-y-(--toast-swipe-movement-y) items-start gap-3 rounded-xl bg-popover p-3.5 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition-[translate,opacity] duration-200 select-none data-ending-style:opacity-0 data-limited:hidden data-starting-style:-translate-y-2 data-starting-style:opacity-0 data-swiping:transition-none md:data-starting-style:translate-y-2"
    >
      {t.type === "success" && <CircleCheckIcon className="mt-px size-4.5 shrink-0 text-income" />}
      {t.type === "error" && (
        <CircleAlertIcon className="mt-px size-4.5 shrink-0 text-destructive" />
      )}
      <Toast.Content className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Toast.Title className="font-medium" />
        <Toast.Description className="text-[0.8125rem] text-muted-foreground" />
        {t.actionProps && (
          <Toast.Action className={buttonVariants({ size: "sm", className: "mt-2 self-start" })} />
        )}
      </Toast.Content>
      <Toast.Close
        aria-label="Cerrar"
        className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-4" />
      </Toast.Close>
    </Toast.Root>
  ));
}

// Top on phones, clear of the bottom tab bar; bottom-right from md up.
export function Toaster() {
  return (
    <Toast.Provider toastManager={toast}>
      <Toast.Portal>
        <Toast.Viewport className="pointer-events-none fixed inset-x-4 top-[max(env(safe-area-inset-top),12px)] z-100 mx-auto flex max-w-sm flex-col gap-2 outline-none md:top-auto md:right-6 md:bottom-6 md:left-auto md:w-90 md:flex-col-reverse">
          <Toasts />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

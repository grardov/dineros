"use client";

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { capitalize, monthName, shiftMonth } from "@/components/finance";

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
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { useStore } from "@/lib/store";
import { shortDate } from "@/lib/types";

// Shared shell for the create/edit dialogs. onSubmit/onDelete resolve to an error message to keep
// it open, or null to close and toast `saved`/`deleted`.
export function FormDialog({
  open,
  onClose,
  title,
  onSubmit,
  onDelete,
  saved,
  deleted,
  submitLabel = "Guardar",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (data: FormData) => Promise<string | null> | string | null;
  onDelete?: () => Promise<string | null>;
  saved: string;
  deleted?: string;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const close = () => {
    setError(null);
    onClose();
  };
  const run = (fn: () => Promise<string | null> | string | null, done?: string) =>
    startTransition(async () => {
      const err = await fn();
      if (err) return setError(err);
      close();
      if (done) toast.add({ title: done, type: "success" });
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => onSubmit(new FormData(e.currentTarget)), saved);
          }}
          className="flex flex-col gap-4"
        >
          <FieldGroup className="gap-4">{children}</FieldGroup>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="-mx-6 -mb-6 bg-sidebar px-6 py-3.5">
            {onDelete && (
              <AlertDialog open={confirming} onOpenChange={setConfirming}>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      className="text-destructive hover:text-destructive sm:mr-auto"
                    />
                  }
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
                        run(onDelete, deleted);
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
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircleIcon className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// FormData helpers: empty inputs become null. num() accepts MoneyInput's "12,000.50".
export const text = (d: FormData, key: string) => String(d.get(key) ?? "").trim() || null;
export const num = (d: FormData, key: string) => {
  const v = text(d, key);
  return v === null ? null : Number(v.replaceAll(",", ""));
};

// "1234567.891" → "1,234,567.89": digits only, one dot, two decimals, 12 integer digits (the
// DB's numeric(14, 2)).
export function formatAmount(raw: string) {
  const [int, ...rest] = raw.replace(/[^\d.]/g, "").split(".");
  const digits = int.replace(/^0+(?=\d)/, "").slice(0, 12);
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return rest.length ? `${grouped}.${rest.join("").slice(0, 2)}` : grouped;
}

// Text input that groups thousands as you type and pads to two decimals on blur.
// ponytail: no negatives; add a sign toggle if overdrawn opening balances come up.
export function MoneyInput({
  defaultValue,
  currency,
  onValue,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "value" | "defaultValue" | "onChange"> & {
  defaultValue?: number | null;
  currency?: string;
  onValue?: (amount: number | null) => void; // the parsed amount as it's typed
}) {
  const [value, setValue] = useState(defaultValue ? formatAmount(defaultValue.toFixed(2)) : "");
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        {...props}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={value}
        className={`${currency ? "pr-12" : "pr-2.5"} pl-6 tabular-nums`}
        onChange={(e) => {
          const input = e.target;
          // Keep the caret after the same digits once the commas move around.
          const before = input.value
            .slice(0, input.selectionStart ?? input.value.length)
            .replace(/[^\d.]/g, "").length;
          const next = formatAmount(input.value);
          setValue(next);
          onValue?.(next && next !== "." ? Number(next.replaceAll(",", "")) : null);
          requestAnimationFrame(() => {
            let at = 0;
            for (let seen = 0; at < next.length && seen < before; at++)
              if (next[at] !== ",") seen++;
            input.setSelectionRange(at, at);
          });
        }}
        onBlur={() => {
          const n = Number(value.replaceAll(",", ""));
          setValue(value && !Number.isNaN(n) ? formatAmount(n.toFixed(2)) : "");
        }}
      />
      {currency && (
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-subtle">
          {currency}
        </span>
      )}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

// Date ("2026-10-25") or, with `month`, month ("2026-10") field with its own calendar: desktop
// Safari has no month input and won't open its date picker in our dialogs.
export function DateInput({
  id,
  name,
  defaultValue,
  month,
  required,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  month?: boolean;
  required?: boolean; // optional ones can be cleared
  placeholder?: string;
}) {
  const { today } = useStore();
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  // The month (or, with `month`, year) on screen.
  const [view, setView] = useState(() => (defaultValue || today).slice(0, 7));
  const pick = (v: string) => (setValue(v), setOpen(false));

  const first = new Date(`${view}-01T00:00:00`);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cell = (v: string, label: string, aria: string) => (
    <Button
      key={v}
      type="button"
      size="sm"
      variant={v === value ? "default" : "ghost"}
      aria-label={aria}
      aria-pressed={v === value}
      className={`px-0 font-normal tabular-nums ${v === value ? "" : v === today.slice(0, v.length) ? "text-primary" : ""}`}
      onClick={() => pick(v)}
    >
      {label}
    </Button>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => (setOpen(o), o && setView((value || today).slice(0, 7)))}
    >
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-start px-2.5 font-normal md:text-sm"
          />
        }
      >
        <CalendarIcon className="text-muted-foreground" />
        {value ? (
          month ? (
            monthName(value)
          ) : (
            shortDate(value)
          )
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Anterior"
            onClick={() => setView(shiftMonth(view, month ? -12 : -1))}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="font-medium">{month ? view.slice(0, 4) : monthName(view)}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Siguiente"
            onClick={() => setView(shiftMonth(view, month ? 12 : 1))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        {month ? (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, i) => {
              const ym = `${view.slice(0, 4)}-${pad(i + 1)}`;
              const short = new Date(`${ym}-01T00:00:00`)
                .toLocaleDateString("es-MX", { month: "short" })
                .replace(".", "");
              return cell(ym, capitalize(short), monthName(ym));
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="py-1 text-xs text-muted-foreground">
                {d}
              </span>
            ))}
            {/* Monday first: pad up to the 1st's weekday. */}
            {Array.from({ length: (first.getDay() + 6) % 7 }, (_, i) => (
              <span key={`pad${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const iso = `${view}-${pad(i + 1)}`;
              return cell(iso, String(i + 1), shortDate(iso));
            })}
          </div>
        )}
        {!required && value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground"
            onClick={() => pick("")}
          >
            Quitar
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

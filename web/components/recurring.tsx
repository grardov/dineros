"use client";

import { RepeatIcon } from "lucide-react";
import { useState } from "react";

import { TransactionIcon } from "@/components/category-icon";
import { MoreLink, dayMonth, daysUntil, monthName, shiftMonth } from "@/components/finance";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { type Recurring, type RecurringOccurrence, money, signedMoney } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Occurrence = RecurringOccurrence & { fijo: Recurring };

// A month of fijos (this one or the next) and its totals. "Out" is expenses plus transfers
// (card payments, savings): money leaving the account it's paid from.
export function useFijosMonth(offset: 0 | 1) {
  const store = useStore();
  const month = `${shiftMonth(store.today, offset)}-01`;
  const items: Occurrence[] = store.occurrences.flatMap((o) => {
    const fijo = store.fijo(o.recurring_id);
    return o.month === month && fijo ? [{ ...o, fijo }] : [];
  });
  const sum = (xs: Occurrence[], f: (o: Occurrence) => number) => xs.reduce((s, o) => s + f(o), 0);
  const income = items.filter((o) => o.fijo.kind === "income");
  const out = items.filter((o) => o.fijo.kind !== "income");
  return {
    month,
    items,
    income: sum(income, (o) => o.expected_amount),
    out: sum(out, (o) => o.expected_amount),
    paidOut: sum(out, (o) =>
      o.status === "paid" ? Math.max(o.paid_amount, o.expected_amount) : o.paid_amount,
    ),
    leftOut: sum(out, (o) =>
      o.status === "paid" ? 0 : Math.max(o.expected_amount - o.paid_amount, 0),
    ),
    // What each account has to cover, for "Necesitas en cada cuenta".
    byAccount: Map.groupBy(out, (o) => o.fijo.account_id),
  };
}

function dueText(o: Occurrence, today: string) {
  const income = o.fijo.kind === "income";
  if (o.status === "paid") return income ? "Recibido" : "Pagado";
  const days = daysUntil(today, o.due_on);
  if (days < 0)
    return income
      ? `Sin registrar · esperado el ${dayMonth(o.due_on)}`
      : `Venció el ${dayMonth(o.due_on)}`;
  const when = days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`;
  return `${income ? "Llega" : "Vence"} el ${dayMonth(o.due_on)} · ${when}`;
}

// One expected payment: what, when, how much, and a button to register it.
export function OccurrenceRow({ o, onEdit }: { o: Occurrence; onEdit?: () => void }) {
  const store = useStore();
  const [registering, setRegistering] = useState(false);
  const { fijo } = o;
  const left = Math.max(o.expected_amount - o.paid_amount, 0);
  const amount = o.status === "paid" ? Math.max(o.paid_amount, o.expected_amount) : left;
  const account = store.account(fijo.account_id);
  const to = store.account(fijo.to_account_id);

  return (
    <div className="flex items-center gap-3 border-b border-muted px-4 py-3 last:border-b-0 md:px-[18px]">
      <TransactionIcon transaction={fijo} className="size-9 rounded-[10px]" />
      <button
        type="button"
        onClick={onEdit}
        disabled={!onEdit}
        className="flex min-w-0 flex-1 flex-col gap-0.5 text-left outline-none focus-visible:underline"
      >
        <span className="truncate text-sm font-medium">{fijo.name}</span>
        <span
          className={cn(
            "truncate text-xs text-muted-foreground",
            o.status === "overdue" && "font-medium text-expense",
          )}
        >
          {dueText(o, store.today)}
          {account && ` · ${account.name}${to ? ` → ${to.name}` : ""}`}
        </span>
      </button>
      {/* Phones stack the amount over the action so the name keeps its room. */}
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span className="flex flex-col items-end gap-0.5">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              fijo.kind === "income" ? "text-income" : "text-foreground",
              o.status === "paid" && "text-muted-foreground line-through decoration-1",
            )}
          >
            {o.is_estimate && o.status !== "paid" && (
              <span className="font-normal text-subtle">≈ </span>
            )}
            {signedMoney(
              fijo.kind === "income" ? amount : -amount,
              account?.currency,
              fijo.kind === "income",
            )}
          </span>
          {o.paid_amount > 0 && o.status !== "paid" && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Pagado {money(o.paid_amount, account?.currency)}
            </span>
          )}
        </span>
        <span className="text-right sm:w-24">
          {o.status === "paid" ? (
            <Badge variant="income">{fijo.kind === "income" ? "Recibido" : "Pagado"}</Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setRegistering(true)}>
              Registrar
            </Button>
          )}
        </span>
      </div>
      {registering && (
        <TransactionDialog
          open
          onClose={() => setRegistering(false)}
          preset={{
            kind: fijo.kind,
            amount: left || undefined,
            account_id: fijo.account_id,
            to_account_id: fijo.to_account_id,
            category_id: fijo.category_id,
            description: fijo.name,
            occurred_on: store.today < o.due_on ? store.today : o.due_on,
            recurring_id: fijo.id,
            recurring_period: o.month,
          }}
        />
      )}
    </div>
  );
}

// Resumen card: how this month's fijos are going and what next month needs.
export function FijosCard() {
  const store = useStore();
  const now = useFijosMonth(0);
  const next = useFijosMonth(1);
  const pct = now.out ? Math.min(100, (now.paidOut / now.out) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Fijos</CardTitle>
        <MoreLink href="/recurring">{store.recurring.length ? "Ver fijos" : "Agregar"}</MoreLink>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-[0.8125rem]">
        {store.recurring.length ? (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{monthName(now.month, false)}</span>
                <span className="tabular-nums">
                  <b className="font-semibold">{money(now.paidOut)}</b>
                  <span className="text-muted-foreground"> de {money(now.out)}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              {now.leftOut > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  Faltan {money(now.leftOut)}
                </span>
              )}
            </div>
            <div className="flex justify-between border-t border-muted pt-3">
              <span className="text-muted-foreground">{monthName(next.month, false)}</span>
              <span className="flex flex-col items-end gap-0.5 tabular-nums">
                <b className="font-semibold">{signedMoney(-next.out, "MXN", false)}</b>
                {next.income > 0 &&
                  (next.income >= next.out ? (
                    <span className="text-xs text-muted-foreground">
                      Te sobran {money(next.income - next.out)}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-expense">
                      Te faltan {money(next.out - next.income)}
                    </span>
                  ))}
              </span>
            </div>
          </>
        ) : (
          <p className="flex gap-2 text-muted-foreground">
            <RepeatIcon className="mt-0.5 size-4 shrink-0" />
            Agrega tus pagos de cada mes (renta, luz, tarjetas, ahorro) para ver cuánto vas a
            necesitar el próximo mes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { CalendarCheckIcon, PlusIcon, RepeatIcon } from "lucide-react";
import { useState } from "react";

import { TransactionIcon } from "@/components/category-icon";
import {
  AccountTile,
  EmptyState,
  PageHeader,
  Stat,
  monthName,
  useCountUp,
} from "@/components/finance";
import { OccurrenceRow, useFijosMonth } from "@/components/recurring";
import { RecurringDialog } from "@/components/recurring-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { FREQUENCIES, type Recurring, money, signedMoney } from "@/lib/types";

export default function RecurringPage() {
  const store = useStore();
  const [editing, setEditing] = useState<{ recurring?: Recurring } | null>(null);
  const now = useFijosMonth(0);
  const next = useFijosMonth(1);
  const paidOut = useCountUp(now.paidOut);
  const edit = (recurring: Recurring) => () => setEditing({ recurring });

  const describe = (r: Recurring) => {
    const to = store.account(r.to_account_id);
    if (r.amount === null && to?.type === "credit")
      return `Lo del estado de cuenta · día ${r.day_of_month}`;
    return `${FREQUENCIES[r.every_months]} · día ${r.day_of_month}`;
  };
  const byDay = store.recurring.toSorted(
    (a, b) => Number(!!a.paused_at) - Number(!!b.paused_at) || a.day_of_month - b.day_of_month,
  );

  return (
    <>
      <PageHeader title="Fijos">
        <Button onClick={() => setEditing({})}>
          <PlusIcon /> Nuevo fijo
        </Button>
      </PageHeader>

      {!store.recurring.length ? (
        <Card>
          <EmptyState
            icon={RepeatIcon}
            title="Aún no tienes fijos"
            action={
              <Button onClick={() => setEditing({})}>
                <PlusIcon /> Nuevo fijo
              </Button>
            }
          >
            Registra lo que pagas y recibes cada mes (renta, luz, nómina, pagos de tarjeta, ahorro)
            para ver cuánto vas a necesitar el próximo mes y registrarlo en un clic.
          </EmptyState>
        </Card>
      ) : (
        <>
          <section className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base leading-tight font-semibold tracking-tight">
                {monthName(now.month)}
              </h2>
              {now.out > 0 && (
                <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
                  Pagado <b className="text-foreground">{money(paidOut)}</b> de {money(now.out)}
                  {now.leftOut > 0 && ` · faltan ${money(now.leftOut)}`}
                </span>
              )}
            </div>
            <Card className="gap-0 py-0">
              {now.items.length ? (
                now.items.map((o) => (
                  <OccurrenceRow key={o.recurring_id} o={o} onEdit={edit(o.fijo)} />
                ))
              ) : (
                <EmptyState icon={CalendarCheckIcon} title="Nada que pagar este mes" />
              )}
            </Card>
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-base leading-tight font-semibold tracking-tight">
              {monthName(next.month)} · proyección
            </h2>
            <Card className="grid grid-cols-3 gap-0 p-0">
              {[
                ["Entradas", next.income, "text-income"],
                ["Salidas", -next.out, "text-expense"],
                next.income >= next.out
                  ? ["Te sobra", next.income - next.out, "text-foreground"]
                  : ["Te falta", next.out - next.income, "text-expense"],
              ].map(([label, value, color]) => (
                <Stat
                  key={label as string}
                  label={label}
                  className="border-r border-muted px-3 py-3.5 last:border-r-0 sm:px-4 sm:py-4 md:px-5.5"
                >
                  <span
                    className={`text-[15px] font-semibold whitespace-nowrap tabular-nums sm:text-lg md:text-xl ${color}`}
                  >
                    {signedMoney(value as number, "MXN", false)}
                  </span>
                </Stat>
              ))}
            </Card>
            {next.byAccount.size > 0 && (
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Necesitas en cada cuenta</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {[...next.byAccount].map(([id, items]) => {
                    const account = store.account(id);
                    if (!account) return null;
                    const need = items.reduce((s, o) => s + o.expected_amount, 0);
                    const balance = store.balance(id);
                    return (
                      <div key={id} className="flex items-center gap-2.5 text-sm">
                        <AccountTile account={account} className="size-7 rounded-lg" />
                        <span className="min-w-0 flex-1 truncate font-medium">{account.name}</span>
                        <span className="flex flex-col items-end tabular-nums">
                          <b className="font-semibold">{money(need, account.currency)}</b>
                          <span
                            className={`text-xs ${balance < need ? "text-warning" : "text-muted-foreground"}`}
                          >
                            Hoy tienes {signedMoney(balance, account.currency, false)}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
            <Card className="gap-0 py-0">
              {next.items.length ? (
                next.items.map((o) => (
                  <OccurrenceRow key={o.recurring_id} o={o} onEdit={edit(o.fijo)} />
                ))
              ) : (
                <EmptyState icon={CalendarCheckIcon} title="Nada programado para el próximo mes" />
              )}
            </Card>
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-base leading-tight font-semibold tracking-tight">
              Todos tus fijos{" "}
              <span className="font-sans text-[0.8125rem] font-normal text-subtle">
                {store.recurring.length}
              </span>
            </h2>
            <Card className="gap-0 py-0">
              {byDay.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={edit(r)}
                  className={`flex w-full items-center gap-3 border-b border-muted px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-sidebar focus-visible:bg-accent focus-visible:outline-none md:px-[18px] ${r.paused_at ? "opacity-60" : ""}`}
                >
                  <TransactionIcon transaction={r} className="size-9 rounded-[10px]" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{r.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {describe(r)} · {store.account(r.account_id)?.name}
                    </span>
                  </span>
                  {r.paused_at && <Badge variant="muted">Pausado</Badge>}
                  <span className="text-sm font-semibold tabular-nums">
                    {r.amount === null ? (
                      <span className="font-normal text-muted-foreground">Variable</span>
                    ) : (
                      <>
                        {r.is_variable && <span className="font-normal text-subtle">≈ </span>}
                        {money(r.amount, store.account(r.account_id)?.currency)}
                      </>
                    )}
                  </span>
                </button>
              ))}
            </Card>
          </section>
        </>
      )}

      {editing && (
        <RecurringDialog recurring={editing.recurring} open onClose={() => setEditing(null)} />
      )}
    </>
  );
}

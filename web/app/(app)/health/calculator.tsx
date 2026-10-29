"use client";

import { useState } from "react";

import { MoneyInput } from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
import { shiftMonth } from "@/components/finance";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { cn } from "cn";

// How often the pay comes, and how many of those make a month.
const PAY = {
  month: { label: "Mensual", perMonth: 1, each: "al mes" },
  fortnight: { label: "Quincenal", perMonth: 2, each: "cada quincena" },
  week: { label: "Semanal", perMonth: 52 / 12, each: "cada semana" },
} as const;
type Pay = keyof typeof PAY;

// Rules of thumb it compares against, not advice: CONDUSEF suggests saving at least 10% of income,
// and Fidelity's 50/15/5 puts retirement at 15% (counting what the employer pays into the Afore).
const MIN_PCT = 10;
const RETIREMENT_PCT = 15;

function Row({
  label,
  hint,
  amount,
  dot,
  badge,
}: {
  label: string;
  hint?: string;
  amount: string;
  dot?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      {dot && <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dot)} />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          {label}
          {badge}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <span className="text-sm font-semibold whitespace-nowrap tabular-nums">{amount}</span>
    </div>
  );
}

// What usually comes in a month: the average of the last three closed months with any income, or
// this month's when there's none.
export function useTypicalIncome() {
  const store = useStore();
  const thisMonth = store.today.slice(0, 7);
  const income = (ym: string) =>
    store.transactions
      .filter((t) => t.kind === "income" && t.occurred_on.startsWith(ym))
      .reduce((s, t) => s + t.amount, 0);
  const past = [1, 2, 3].map((i) => income(shiftMonth(thisMonth, -i))).filter(Boolean);
  return past.length ? past.reduce((s, n) => s + n, 0) / past.length : income(thisMonth);
}

// Money at hand: what's in debit, cash and savings accounts.
export function useLiquid() {
  const store = useStore();
  return store.accounts
    .filter((a) => !a.archived_at && ["debit", "cash", "savings"].includes(a.type))
    .reduce((s, a) => s + Math.max(store.balance(a.id), 0), 0);
}

// How much to set aside from a paycheck under the user's rule, next to common guidelines, and how
// long the fondo de emergencia takes at that pace (counting the money already at hand).
export function SavingsCalculator() {
  const store = useStore();
  const { profile } = store;
  const defaultIncome = Math.round(useTypicalIncome() * 100) / 100; // monthly
  const liquid = useLiquid();
  const [amount, setAmount] = useState<number | null>(defaultIncome || null);
  const [pay, setPay] = useState<Pay>("month");
  const monthly = (amount ?? 0) * PAY[pay].perMonth;
  const share = (pct: number) => (monthly * pct) / 100;
  const perPay = (monthlyAmount: number) => monthlyAmount / PAY[pay].perMonth;

  const save = share(profile.savings_pct);
  const fund = profile.emergency_months * share(profile.needs_pct);
  const missing = Math.max(fund - liquid, 0);
  const monthsToFund = save > 0 ? Math.ceil(missing / save) : null;

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="calc-income">¿Cuánto te depositan?</FieldLabel>
            <MoneyInput
              id="calc-income"
              defaultValue={defaultIncome || null}
              currency={profile.currency}
              onValue={setAmount}
            />
            <FieldDescription>
              Tu ingreso neto: lo que llega a tu cuenta, ya sin impuestos.
            </FieldDescription>
          </Field>
          <Tabs value={pay} onValueChange={(v) => setPay(v as Pay)}>
            <TabsList className="grid w-full grid-cols-3">
              {Object.entries(PAY).map(([value, { label }]) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {monthly > 0 ? (
            <>
              <div className="flex flex-col gap-1 rounded-lg bg-sidebar px-4 py-3.5">
                <span className="text-[0.8125rem] text-muted-foreground">Aparta</span>
                <span className="text-[26px] leading-none font-semibold tracking-tight tabular-nums">
                  {store.money(perPay(save))}{" "}
                  <span className="text-base font-medium text-muted-foreground">
                    {PAY[pay].each}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {pay !== "month" && `${store.money(save)} al mes · `}
                  {profile.savings_pct}% de tu ingreso, según tu regla
                </span>
              </div>
              <div className="flex flex-col divide-y">
                <Row
                  label={`Necesidades · ${profile.needs_pct}%`}
                  dot="bg-needs"
                  amount={store.money(perPay(share(profile.needs_pct)))}
                />
                <Row
                  label={`Deseos · ${profile.wants_pct}%`}
                  dot="bg-wants"
                  amount={store.money(perPay(share(profile.wants_pct)))}
                />
                <Row
                  label={`Ahorro · ${profile.savings_pct}%`}
                  dot="bg-savings"
                  amount={store.money(perPay(save))}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Escribe cuánto cobras para calcularlo.</p>
          )}
        </div>

        {monthly > 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold">Cómo se compara, {PAY[pay].each}</h3>
              <div className="flex flex-col divide-y">
                <Row
                  label={`Mínimo recomendado · ${MIN_PCT}%`}
                  hint="Lo que sugiere la CONDUSEF para empezar a ahorrar."
                  amount={store.money(perPay(share(MIN_PCT)))}
                />
                <Row
                  label={`Tu regla · ${profile.savings_pct}%`}
                  hint="Lo que apartas para ahorro y deudas."
                  amount={store.money(perPay(save))}
                  badge={
                    profile.savings_pct < MIN_PCT && (
                      <Badge variant="warning">Abajo del mínimo</Badge>
                    )
                  }
                />
                <Row
                  label={`Para tu retiro · ${RETIREMENT_PCT}%`}
                  hint="Contando lo que tu patrón ya aporta a tu Afore."
                  amount={store.money(perPay(share(RETIREMENT_PCT)))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 rounded-lg border px-4 py-3.5">
              <span className="text-sm font-semibold">Fondo de emergencia</span>
              <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
                Meta: {profile.emergency_months} meses de necesidades, {store.money(fund)}. Tienes{" "}
                {store.money(liquid)} en débito, efectivo y ahorro.
              </span>
              <span className="text-[0.8125rem] font-medium">
                {!missing
                  ? "Ya lo tienes completo: lo que ahorres puede ir a tu retiro y tus metas."
                  : monthsToFund
                    ? `Te faltan ${store.money(missing)}: apartando ${store.money(save)} al mes lo completas en ${monthsToFund} ${monthsToFund === 1 ? "mes" : "meses"}.`
                    : `Te faltan ${store.money(missing)}. Sube tu % de ahorro para calcular cuándo lo completas.`}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Apártalo el día que cobras: ahorrar lo que sobra casi nunca funciona. Son referencias
              generales; ajústalas a tu situación.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import {
  MonthPicker,
  PageHeader,
  UtilizationBar,
  monthName,
  shiftMonth,
} from "@/components/finance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import type { MonthlyTotal } from "@/lib/types";
import { cn } from "cn";

import { SavingsCalculator } from "./calculator";
import { RuleDialog } from "./rule-dialog";
import { HealthSetup } from "./setup";

type Tone = "good" | "warn" | "bad";
const TONES: Record<Tone, { label: string; badge: "income" | "warning" | "expense" }> = {
  good: { label: "Bien", badge: "income" },
  warn: { label: "Cerca", badge: "warning" },
  bad: { label: "Revisa", badge: "expense" },
};
// Within 5 points of the goal is "close".
const atMost = (v: number, max: number): Tone =>
  v <= max ? "good" : v <= max + 5 ? "warn" : "bad";
const atLeast = (v: number, min: number): Tone =>
  v >= min ? "good" : v >= min - 5 ? "warn" : "bad";

const pct = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

function Status({ tone }: { tone: Tone | null }) {
  if (!tone) return null;
  return <Badge variant={TONES[tone].badge}>{TONES[tone].label}</Badge>;
}

// A share of income against its goal: the bar fills to the share in the bucket's color, the tick
// marks the goal, and the badge says how it's doing.
function RuleRow({
  label,
  color,
  hint,
  amount,
  share,
  goal,
  tone,
}: {
  label: string;
  color: string;
  hint: string;
  amount: number;
  share: number;
  goal: number;
  tone: Tone;
}) {
  const store = useStore();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={cn("size-2.5 shrink-0 rounded-full", color)} />
        <span className="text-sm font-medium">{label}</span>
        <Status tone={tone} />
        <span className="ml-auto text-sm font-semibold tabular-nums">{store.money(amount)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${Math.min(Math.max(share, 0), 100)}%` }}
        />
        <span
          aria-hidden
          className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground"
          style={{ left: `${goal}%` }}
        />
      </div>
      <div className="flex justify-between gap-3 text-xs text-muted-foreground tabular-nums">
        <span className="max-sm:hidden">{hint}</span>
        <span>
          {share.toFixed(0)}% de tus ingresos · meta {goal}%
        </span>
      </div>
    </div>
  );
}

function Indicator({
  title,
  tone,
  value,
  children,
}: {
  title: string;
  tone: Tone | null;
  value: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        <Status tone={tone} />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-[26px] leading-none font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        <div className="flex flex-col gap-2 text-[0.8125rem] text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}

export function Health({ totals }: { totals: MonthlyTotal[] }) {
  const store = useStore();
  const { profile } = store;
  const thisMonth = store.today.slice(0, 7);
  const first = shiftMonth(thisMonth, -5);
  const [month, setMonth] = useState(thisMonth);
  const [editingRule, setEditingRule] = useState(false);

  const of = (ym: string) => {
    const rows = totals.filter((t) => t.month.startsWith(ym));
    const sum = (f: (t: MonthlyTotal) => boolean) =>
      rows.filter(f).reduce((s, t) => s + t.amount, 0);
    const income = sum((t) => t.kind === "income");
    const needs = sum((t) => t.kind === "expense" && t.bucket === "need");
    const wants = sum((t) => t.kind === "expense" && t.bucket === "want");
    const other = sum((t) => t.kind === "expense" && t.bucket === null);
    return { income, needs, wants, other, saved: income - needs - wants - other };
  };
  const now = of(month);
  const unclassified = store.categories.filter(
    (c) => c.kind === "expense" && !c.parent_id && !c.bucket,
  );

  // Fondo de emergencia: money at hand over what needs cost in a month (the last three closed
  // months with any, or this one).
  const accounts = store.accounts.filter((a) => !a.archived_at);
  const liquid = accounts
    .filter((a) => a.type === "debit" || a.type === "cash" || a.type === "savings")
    .reduce((s, a) => s + Math.max(store.balance(a.id), 0), 0);
  const pastNeeds = [1, 2, 3].map((i) => of(shiftMonth(thisMonth, -i)).needs).filter(Boolean);
  const monthlyNeeds = pastNeeds.length
    ? pastNeeds.reduce((s, n) => s + n, 0) / pastNeeds.length
    : of(thisMonth).needs;
  const fundMonths = monthlyNeeds ? liquid / monthlyNeeds : null;
  // What usually comes in a month, for the calculator: the last three closed months with any.
  const pastIncome = [1, 2, 3].map((i) => of(shiftMonth(thisMonth, -i)).income).filter(Boolean);
  const typicalIncome = pastIncome.length
    ? pastIncome.reduce((s, n) => s + n, 0) / pastIncome.length
    : of(thisMonth).income;

  // Credit cards: how much of the limit is used, and whether any closed statement went unpaid.
  const cards = accounts.filter((a) => a.type === "credit");
  const limited = cards.filter((a) => a.credit_limit);
  const limit = limited.reduce((s, a) => s + a.credit_limit!, 0);
  const debt = limited.reduce((s, a) => s + Math.max(-store.balance(a.id), 0), 0);
  const utilization = Math.round(pct(debt, limit));
  const overdue = cards.filter((a) =>
    store.statements(a).some((s) => s.is_closed && s.pending > 0 && s.due_date < store.today),
  );

  // Fijos: what the active expense fijos cost per month, against the month's income.
  const fixed = store.recurring
    .filter(
      (r) =>
        r.kind === "expense" &&
        !r.paused_at &&
        r.starts_on <= store.today &&
        (!r.ends_on || r.ends_on >= store.today),
    )
    .reduce((s, r) => s + (r.amount ?? 0) / r.every_months, 0);

  const monthLabel = monthName(month, false).toLowerCase();

  // Nothing to measure against until they set up their rule.
  if (!profile.health_started_at) return <HealthSetup income={typicalIncome} />;

  return (
    <>
      <PageHeader
        eyebrow={`Tu regla ${profile.needs_pct}/${profile.wants_pct}/${profile.savings_pct}`}
        title="Salud financiera"
      >
        <MonthPicker month={month} onChange={setMonth} min={first} max={thisMonth} />
      </PageHeader>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Cómo repartiste {monthLabel}</CardTitle>
            <button
              type="button"
              onClick={() => setEditingRule(true)}
              className="text-[0.8125rem] font-medium whitespace-nowrap text-primary hover:text-accent-foreground"
            >
              Ajustar regla
            </button>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {now.income ? (
              <>
                <RuleRow
                  label="Necesidades"
                  color="bg-needs"
                  hint="Vivienda, súper, servicios…"
                  amount={now.needs}
                  share={pct(now.needs, now.income)}
                  goal={profile.needs_pct}
                  tone={atMost(pct(now.needs, now.income), profile.needs_pct)}
                />
                <RuleRow
                  label="Deseos"
                  color="bg-wants"
                  hint="Restaurantes, viajes, suscripciones…"
                  amount={now.wants}
                  share={pct(now.wants, now.income)}
                  goal={profile.wants_pct}
                  tone={atMost(pct(now.wants, now.income), profile.wants_pct)}
                />
                <RuleRow
                  label="Ahorro"
                  color="bg-savings"
                  hint="Lo que te queda de tus ingresos"
                  amount={now.saved}
                  share={pct(now.saved, now.income)}
                  goal={profile.savings_pct}
                  tone={atLeast(pct(now.saved, now.income), profile.savings_pct)}
                />
                <p className="text-xs text-muted-foreground tabular-nums">
                  Ingresos de {monthLabel}: {store.money(now.income)}
                  {now.other > 0 &&
                    ` · Sin clasificar: ${store.money(now.other)} (${pct(now.other, now.income).toFixed(0)}%), cuenta como gasto pero no como necesidad ni deseo`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay ingresos registrados en {monthLabel}. Registra lo que ganaste para medir tu
                regla.
              </p>
            )}
            {unclassified.length > 0 && (
              <p className="rounded-lg bg-warning-soft px-3 py-2.5 text-[0.8125rem] text-warning">
                {unclassified.length}{" "}
                {unclassified.length === 1
                  ? "categoría no está clasificada"
                  : "categorías no están clasificadas"}{" "}
                como necesidad o deseo ({unclassified.map((c) => c.name).join(", ")}).{" "}
                <Link href="/categories" className="font-medium underline underline-offset-2">
                  {unclassified.length === 1 ? "Clasificarla" : "Clasificarlas"}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {Array.from({ length: 6 }, (_, i) => shiftMonth(thisMonth, i - 5))
              .reverse()
              .map((m) => {
                const t = of(m);
                const spent = t.needs + t.wants + t.other;
                const base = Math.max(t.income, spent);
                const savedPct = pct(t.saved, t.income);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonth(m)}
                    aria-pressed={m === month}
                    className="-mx-2 grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-sidebar aria-pressed:bg-sidebar-accent"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {monthName(m, false).slice(0, 3)}
                    </span>
                    <span className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                      {base > 0 &&
                        (
                          [
                            [t.needs, "bg-needs"],
                            [t.wants, "bg-wants"],
                            [t.other, "bg-chart-4"],
                            [Math.max(t.saved, 0), "bg-savings"],
                          ] as const
                        ).map(([v, c]) => (
                          <span key={c} className={c} style={{ width: `${pct(v, base)}%` }} />
                        ))}
                    </span>
                    <span
                      className={cn(
                        "text-right text-xs tabular-nums",
                        t.income
                          ? {
                              good: "text-income",
                              warn: "text-warning",
                              bad: "text-expense",
                            }[atLeast(savedPct, profile.savings_pct)]
                          : "text-subtle",
                      )}
                    >
                      {t.income ? `ahorro ${savedPct.toFixed(0)}%` : "sin ingresos"}
                    </span>
                  </button>
                );
              })}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {(
                [
                  ["bg-needs", "Necesidades"],
                  ["bg-wants", "Deseos"],
                  ["bg-chart-4", "Sin clasificar"],
                  ["bg-savings", "Ahorro"],
                ] as const
              ).map(([c, l]) => (
                <span key={c} className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", c)} />
                  {l}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Indicator
          title="Fondo de emergencia"
          tone={
            fundMonths === null
              ? null
              : fundMonths >= profile.emergency_months
                ? "good"
                : fundMonths >= profile.emergency_months / 2
                  ? "warn"
                  : "bad"
          }
          value={
            fundMonths === null
              ? "—"
              : `${fundMonths.toFixed(1)} ${fundMonths === 1 ? "mes" : "meses"}`
          }
        >
          {fundMonths === null ? (
            <span>Clasifica tus gastos como necesidades para calcularlo.</span>
          ) : (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(pct(fundMonths, profile.emergency_months), 100)}%` }}
                />
              </div>
              <span>
                Meta: {profile.emergency_months} meses. Tienes {store.money(liquid)} en débito,
                efectivo y ahorro; tus necesidades cuestan unos {store.money(monthlyNeeds)} al mes.
              </span>
            </>
          )}
        </Indicator>

        <Indicator
          title="Uso de tus tarjetas"
          tone={limit ? (utilization < 30 ? "good" : utilization <= 70 ? "warn" : "bad") : null}
          value={limit ? `${utilization}%` : "—"}
        >
          {limit ? (
            <>
              <UtilizationBar pct={utilization} />
              <span>
                Debes {store.money(debt)} de {store.money(limit)} de límite. Abajo de 30% es sano.
              </span>
            </>
          ) : (
            <span>
              {cards.length
                ? "Agrega el límite de tus tarjetas para medirlo."
                : "No tienes tarjetas de crédito."}
            </span>
          )}
        </Indicator>

        <Indicator
          title="Pago de tarjetas"
          tone={cards.length ? (overdue.length ? "bad" : "good") : null}
          value={
            cards.length ? (overdue.length ? `${overdue.length} con atraso` : "Al corriente") : "—"
          }
        >
          <span>
            {!cards.length
              ? "No tienes tarjetas de crédito."
              : overdue.length
                ? `Quedó saldo sin pagar después de la fecha límite en ${overdue.map((a) => a.name).join(", ")}. Eso genera intereses.`
                : "Pagaste el total de cada corte a tiempo."}
          </span>
        </Indicator>

        <Indicator
          title="Fijos vs. ingresos"
          tone={now.income ? atMost(pct(fixed, now.income), profile.needs_pct) : null}
          value={now.income ? `${pct(fixed, now.income).toFixed(0)}%` : "—"}
        >
          <span>
            Tus gastos fijos suman {store.money(fixed)} al mes
            {now.income
              ? `: lo que ya está comprometido de tus ingresos de ${monthLabel}. Meta: abajo de ${profile.needs_pct}%.`
              : "."}
          </span>
        </Indicator>
      </div>
      <SavingsCalculator defaultIncome={typicalIncome} liquid={liquid} />
      {editingRule && <RuleDialog income={now.income} onClose={() => setEditingRule(false)} />}
    </>
  );
}

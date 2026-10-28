"use client";

import Link from "next/link";

import { shiftMonth } from "@/components/finance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { cn } from "cn";

import { atLeast, atMost, pct, type Tone } from "./health";

const TEXT: Record<Tone, string> = {
  good: "text-income",
  warn: "text-warning",
  bad: "text-expense",
};

// The month against the user's rule, for the dashboard. A closed month is measured against what
// came in; the one in progress against what usually comes in, since the pay may not be in yet.
export function HealthCard({ month }: { month: string }) {
  const store = useStore();
  const { profile } = store;
  const thisMonth = store.today.slice(0, 7);

  // A subcategory without a bucket counts toward its parent's.
  const bucketOf = (id: string | null) => {
    const c = store.category(id);
    return c?.bucket ?? store.category(c?.parent_id ?? null)?.bucket ?? null;
  };
  const of = (ym: string) => {
    const txs = store.transactions.filter((t) => t.occurred_on.startsWith(ym));
    const sum = (f: (t: Transaction) => boolean) => txs.filter(f).reduce((s, t) => s + t.amount, 0);
    const expense = (bucket: string) => (t: Transaction) =>
      t.kind === "expense" && bucketOf(t.category_id) === bucket;
    return {
      income: sum((t) => t.kind === "income"),
      needs: sum(expense("need")),
      wants: sum(expense("want")),
      spent: sum((t) => t.kind === "expense"),
    };
  };

  const now = of(month);
  const current = month === thisMonth;
  const pastIncome = [1, 2, 3].map((i) => of(shiftMonth(thisMonth, -i)).income).filter(Boolean);
  const typicalIncome = pastIncome.length
    ? pastIncome.reduce((s, n) => s + n, 0) / pastIncome.length
    : 0;
  const base = current ? Math.max(now.income, typicalIncome) : now.income;
  // What's left to spend before it eats into the savings goal.
  const room = base * (1 - profile.savings_pct / 100) - now.spent;

  const rows = [
    {
      label: "Necesidades",
      color: "bg-needs",
      share: pct(now.needs, base),
      goal: profile.needs_pct,
      tone: atMost(pct(now.needs, base), profile.needs_pct),
    },
    {
      label: "Deseos",
      color: "bg-wants",
      share: pct(now.wants, base),
      goal: profile.wants_pct,
      tone: atMost(pct(now.wants, base), profile.wants_pct),
    },
    {
      label: "Ahorro",
      color: "bg-savings",
      share: pct(base - now.spent, base),
      goal: profile.savings_pct,
      tone: atLeast(pct(base - now.spent, base), profile.savings_pct),
    },
  ];
  const onTrack = rows.filter((r) => r.tone === "good").length;

  return (
    <Card className="relative transition-colors hover:bg-sidebar">
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/health"
            className="text-[0.8125rem] text-muted-foreground after:absolute after:inset-0"
          >
            {profile.health_started_at ? "Tu regla" : "Salud financiera"}
          </Link>
          {profile.health_started_at && base > 0 && (
            <Badge variant={onTrack === 3 ? "income" : onTrack === 2 ? "warning" : "expense"}>
              {onTrack} de 3 en meta
            </Badge>
          )}
        </div>

        {!profile.health_started_at ? (
          <>
            <p className="text-sm text-pretty">
              Mide cada mes contra tu propia regla, como la 50/30/20.
            </p>
            <span className="text-[0.8125rem] font-medium text-primary">Activar →</span>
          </>
        ) : !base ? (
          <p className="text-sm text-muted-foreground">
            Registra tus ingresos para medir tu regla.
          </p>
        ) : (
          <>
            {rows.map((r) => (
              <div key={r.label} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={cn("size-2 shrink-0 rounded-full", r.color)} />
                  <span className="font-medium">{r.label}</span>
                  <span className={cn("ml-auto font-semibold tabular-nums", TEXT[r.tone])}>
                    {Math.round(r.share)}%
                  </span>
                  <span className="text-subtle tabular-nums">/ {r.goal}%</span>
                </div>
                <div className="relative h-1.5 rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", r.color)}
                    style={{ width: `${Math.min(Math.max(r.share, 0), 100)}%` }}
                  />
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-foreground"
                    style={{ left: `${r.goal}%` }}
                  />
                </div>
              </div>
            ))}
            <span className="text-xs text-muted-foreground tabular-nums">
              {!current
                ? `De ${store.money(base)} de ingresos`
                : room >= 0
                  ? `Te quedan ${store.money(room)} sin tocar tu ahorro`
                  : `Ya gastaste ${store.money(-room)} de tu ahorro`}
            </span>
          </>
        )}
      </CardContent>
    </Card>
  );
}

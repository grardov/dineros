"use client";

import Link from "next/link";

import { Stat } from "@/components/finance";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { cn } from "cn";

import { useTypicalIncome } from "./calculator";
import { atLeast, atMost, pct, type Tone } from "./health";

const TEXT: Record<Tone, string> = {
  good: "text-income",
  warn: "text-warning",
  bad: "text-expense",
};

// The month against the user's rule, for the dashboard, laid out like the other figures: how many
// goals it meets, and income split into one bar like a phone's storage. A closed month is measured
// against what came in; the one in progress against what usually comes in, since the pay may not
// be in yet.
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
  const typicalIncome = useTypicalIncome();
  const base = month === thisMonth ? Math.max(now.income, typicalIncome) : now.income;
  const saved = base - now.spent;

  // How far each share is from its goal (positive: missed it), worst first.
  const goals = [
    { label: "Necesidades", share: pct(now.needs, base), goal: profile.needs_pct, max: true },
    { label: "Deseos", share: pct(now.wants, base), goal: profile.wants_pct, max: true },
    { label: "Ahorro", share: pct(saved, base), goal: profile.savings_pct, max: false },
  ]
    .map((g) => ({
      ...g,
      tone: (g.max ? atMost : atLeast)(g.share, g.goal),
      miss: g.max ? g.share - g.goal : g.goal - g.share,
    }))
    .sort((a, b) => b.miss - a.miss);
  const met = goals.filter((g) => g.tone === "good").length;
  const worst = goals[0];

  const whole = Math.max(base, now.spent);
  const segments = [
    ["Necesidades", now.needs, "bg-needs"],
    ["Deseos", now.wants, "bg-wants"],
    ["Sin clasificar", now.spent - now.needs - now.wants, "bg-chart-4"],
    ["Ahorro", Math.max(saved, 0), "bg-savings"],
  ] as const;

  const active = profile.health_started_at && base > 0;

  return (
    <Card className="relative transition-colors hover:bg-sidebar">
      <CardContent>
        <Stat
          label={
            <Link href="/health" className="after:absolute after:inset-0">
              Tu regla
              {profile.health_started_at &&
                ` · ${profile.needs_pct}/${profile.wants_pct}/${profile.savings_pct}`}
            </Link>
          }
        >
          <span
            className={cn(
              "truncate text-xl leading-none font-semibold tracking-tight tabular-nums md:text-[26px]",
              !active && "text-subtle",
            )}
          >
            {!profile.health_started_at ? (
              "Sin activar"
            ) : active ? (
              <>
                {met} de 3{" "}
                <span className="text-sm font-medium tracking-normal text-muted-foreground">
                  en meta
                </span>
              </>
            ) : (
              "—"
            )}
          </span>
          <div className="flex items-center gap-2">
            <div
              role={active ? "img" : undefined}
              aria-label={
                active
                  ? segments.map(([label, v]) => `${label} ${Math.round(pct(v, base))}%`).join(", ")
                  : undefined
              }
              className="flex h-[5px] min-w-12 flex-1 gap-0.5 overflow-hidden rounded-full bg-secondary"
            >
              {active &&
                segments.map(([label, v, color]) => (
                  <span
                    key={label}
                    title={`${label}: ${Math.round(pct(v, base))}%`}
                    className={color}
                    style={{ width: `${pct(v, whole)}%` }}
                  />
                ))}
            </div>
            <span
              title={
                active && worst.tone !== "good"
                  ? `${worst.label}: ${Math.round(worst.share)}% de tus ingresos, meta ${worst.goal}%`
                  : undefined
              }
              className={cn(
                "min-w-0 truncate text-xs tabular-nums",
                !profile.health_started_at
                  ? "font-medium text-primary"
                  : active
                    ? TEXT[worst.tone]
                    : "text-muted-foreground",
              )}
            >
              {!profile.health_started_at
                ? "Actívala →"
                : !active
                  ? "Sin ingresos"
                  : worst.tone === "good"
                    ? "Todo en meta"
                    : `${worst.label} ${Math.round(worst.share)}%`}
            </span>
          </div>
        </Stat>
      </CardContent>
    </Card>
  );
}

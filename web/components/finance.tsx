"use client";

import {
  BanknoteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  EyeIcon,
  EyeOffIcon,
  LandmarkIcon,
  PiggyBankIcon,
  TrendingUpIcon,
} from "lucide-react";

import { Tooltip } from "@base-ui/react/tooltip";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { findInstitution } from "@/lib/institutions";
import { iso, useStore } from "@/lib/store";
import type { Account, AccountType } from "@/lib/types";
import { cn } from "cn";

// Large amounts: the cents go muted so the whole figure carries the weight.
export function Amount({
  value,
  currency,
  className,
  centsClassName = "text-subtle",
}: {
  value: number;
  currency?: string;
  className?: string;
  centsClassName?: string;
}) {
  const store = useStore();
  const s = store.signedMoney(value, currency, false);
  const dot = store.hidden ? s.length : s.lastIndexOf(".");
  return (
    <span className={cn("font-semibold tracking-tight tabular-nums", className)}>
      {s.slice(0, dot)}
      <span className={centsClassName}>{s.slice(dot)}</span>
    </span>
  );
}

// The value eases from the last one it showed to the new one; it starts where it is.
export function useCountUp(value: number, ms = 550) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    const t0 = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const p = duration ? Math.min((t - t0) / duration, 1) : 1;
      from.current = start + (value - start) * (1 - (1 - p) ** 3);
      setShown(from.current);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, ms]);
  return shown;
}

// An Amount that counts to a new value, tints for a moment and floats the change above it.
export function CountUpAmount({
  value,
  deltaClassName,
  ...props
}: React.ComponentProps<typeof Amount> & { deltaClassName?: string }) {
  const store = useStore();
  const shown = useCountUp(value);
  const [prev, setPrev] = useState(value);
  const [change, setChange] = useState<{ n: number; delta: number } | null>(null);
  if (value !== prev) {
    setPrev(value);
    setChange({ n: (change?.n ?? 0) + 1, delta: value - prev });
  }
  const tone = change && (change.delta > 0 ? "var(--income)" : "var(--expense)");
  return (
    <span className="relative">
      <span
        key={change?.n}
        className={change ? "md:animate-tint" : undefined}
        style={{ "--tint": tone } as React.CSSProperties}
      >
        <Amount value={shown} {...props} />
      </span>
      {change && (
        <span
          key={`delta-${change.n}`}
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-0 bottom-full mb-1 animate-float-away text-[0.8125rem] font-semibold whitespace-nowrap tabular-nums",
            change.delta > 0 ? "text-income" : "text-expense",
            deltaClassName,
          )}
        >
          {store.signedMoney(change.delta, props.currency)}
        </span>
      )}
    </span>
  );
}

export const ACCOUNT_ICONS: Record<AccountType, typeof LandmarkIcon> = {
  debit: LandmarkIcon,
  credit: CreditCardIcon,
  cash: BanknoteIcon,
  savings: PiggyBankIcon,
  investment: TrendingUpIcon,
};

// The institution's logo when we have one; otherwise an icon for the type, where credit cards get
// the dark tile so debt reads differently from money you have.
export function AccountTile({ account, className }: { account: Account; className?: string }) {
  const institution = findInstitution(account.institution);
  if (institution?.logo)
    return (
      <Image
        src={`/institutions/${institution.id}.png`}
        alt=""
        width={128}
        height={128}
        className={cn(
          "size-9 shrink-0 rounded-[10px] border border-border bg-white object-cover",
          className,
        )}
      />
    );
  const Icon = ACCOUNT_ICONS[account.type];
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
        account.type === "credit" ? "bg-foreground text-white" : "bg-secondary text-foreground",
        className,
      )}
      aria-hidden
    >
      <Icon className="size-[45%]" />
    </span>
  );
}

// < 30% healthy, 30–70% caution, > 70% high.
export function UtilizationBar({ pct, className }: { pct: number; className?: string }) {
  const color = pct > 70 ? "bg-expense" : pct >= 30 ? "bg-[#d08a1f]" : "bg-primary";
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className={cn("h-full rounded-full", color)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

const DAY = 86_400_000;
export const daysUntil = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY);

// Credit card numbers shared by the dashboard, the accounts grid and the detail page.
export function useCredit(account: Account) {
  const store = useStore();
  const debt = -store.balance(account.id);
  const limit = account.credit_limit;
  // The closed statement still waiting for its payment, if any.
  const due = store
    .statements(account)
    .find((s) => s.is_closed && s.pending > 0 && s.due_date >= store.today);
  return {
    debt,
    available: limit === null ? null : limit - debt,
    utilization: limit ? Math.round((Math.max(debt, 0) / limit) * 100) : 0,
    due,
    dueInDays: due ? daysUntil(store.today, due.due_date) : null,
  };
}

export const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

// "2026-10" → "Octubre de 2026" (or "Octubre").
export const monthName = (ym: string, year = true) =>
  capitalize(
    new Date(`${ym.slice(0, 7)}-01T00:00:00`).toLocaleDateString("es-MX", {
      month: "long",
      ...(year && { year: "numeric" }),
    }),
  );

export const shiftMonth = (ym: string, by: number) => {
  const d = new Date(`${ym.slice(0, 7)}-01T00:00:00`);
  d.setMonth(d.getMonth() + by);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const dayMonth = (iso: string) =>
  new Date(`${iso}T00:00:00`)
    .toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    .replace(".", "");

export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const SPENDING_LEVELS = [
  "bg-muted",
  "bg-expense/25",
  "bg-expense/50",
  "bg-expense/75",
  "bg-expense",
];

const WEEKDAYS = ["", "lun", "", "mié", "", "vie", "", ""]; // a blank over the month labels

// Spending per day from `from` to `to`, shaded by quartile so rent day doesn't wash out the rest;
// days still to come stay faint. Laid out as a calendar (a row per week, Monday first) or, with
// `months`, GitHub-style for the yearly view: a column per week, labeled with months and weekdays.
// Hovering, tapping or arrowing through a day shows its date, total and count.
export function SpendingGrid({
  from,
  to,
  months,
  label,
}: {
  from: string;
  to: string;
  months?: boolean;
  label: string;
}) {
  const store = useStore();
  const grid = useRef<HTMLDivElement>(null);
  // The day shown and its cell, which the label floats over.
  const [picked, setPicked] = useState<{ day: string; cell: Element } | null>(null);
  const active = picked?.day ?? null;
  const start = addDays(from, -((new Date(`${from}T00:00:00`).getDay() + 6) % 7));
  const weeks = Math.ceil((daysUntil(start, to) + 1) / 7);
  const last = to < store.today ? to : store.today;
  const spent = Array.from({ length: Math.max(daysUntil(from, last) + 1, 0) }, (_, i) =>
    store.spentOn(addDays(from, i)),
  )
    .filter(Boolean)
    .sort((a, b) => a - b);
  const quartiles = [0.25, 0.5, 0.75].map((p) => spent[Math.floor(p * (spent.length - 1))]);
  const level = (v: number) => (v > 0 ? 1 + quartiles.filter((q) => v > q).length : 0);

  const pickable = (d: string | undefined): d is string => !!d && d >= from && d <= last;
  const dayAt = (e: React.SyntheticEvent) => (e.target as HTMLElement).dataset.day;
  // Arrows follow the layout: across a row is a day in the calendar, a week in the yearly view.
  const keys: Record<string, number> = months
    ? { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }
    : { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  const setActive = (d: string | null) => {
    if (d === active) return;
    const cell = d && grid.current?.querySelector(`[data-day="${d}"]`);
    setPicked(cell ? { day: d, cell } : null);
  };
  useEffect(() => {
    picked?.cell.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [picked]);

  const count = active ? store.expensesOn(active) : 0;
  const date =
    active &&
    capitalize(
      new Date(`${active}T00:00:00`).toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  const detail = count
    ? `${store.money(store.spentOn(active!))} en ${count} ${count === 1 ? "gasto" : "gastos"}`
    : "Sin gastos";

  return (
    <>
      <div
        ref={grid}
        role="group"
        aria-label={`${label}. Usa las flechas para recorrer los días.`}
        tabIndex={0}
        className={cn(
          "grid w-max cursor-default gap-[2px] rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
          months
            ? "grid-flow-col auto-cols-[9px] grid-cols-[auto] grid-rows-[auto_repeat(7,9px)]"
            : "grid-cols-[repeat(7,8px)] auto-rows-[8px]",
        )}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse" && pickable(dayAt(e))) setActive(dayAt(e)!);
        }}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
        onPointerDown={(e) => {
          // Mice show days on hover; a tap shows one and a second tap hides it.
          const d = dayAt(e);
          if (e.pointerType !== "mouse" && pickable(d)) setActive(d === active ? null : d);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") return setActive(null);
          if (!(e.key in keys)) return;
          e.preventDefault();
          const next = addDays(active ?? last, active ? keys[e.key] : 0);
          if (pickable(next)) setActive(next);
        }}
        onBlur={() => setActive(null)}
      >
        {months &&
          WEEKDAYS.map((d, i) => (
            // Pinned to the left edge so they stay put while the year scrolls.
            <span
              key={`wd${i}`}
              className="sticky left-0 z-[1] bg-card pr-1 text-[0.6875rem] leading-[9px] text-subtle"
            >
              {d}
            </span>
          ))}
        {Array.from({ length: weeks }, (_, w) => {
          const days = Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i));
          const first = days.find((d) => d.endsWith("-01") && d >= from && d <= to);
          return [
            months && (
              <span key={w} className="pb-0.5 text-[0.6875rem] whitespace-nowrap text-subtle">
                {first && monthName(first, false).slice(0, 3).toLowerCase()}
              </span>
            ),
            ...days.map((d) => (
              <span
                key={d}
                data-day={d}
                className={cn(
                  "rounded-[2px]",
                  d < from || d > to
                    ? "invisible"
                    : d > store.today
                      ? "bg-muted/50"
                      : SPENDING_LEVELS[level(store.spentOn(d))],
                  d === active && "ring-1 ring-foreground ring-offset-1 ring-offset-card",
                )}
              />
            )),
          ];
        })}
      </div>
      <span className="sr-only" aria-live="polite">
        {date && `${date}: ${detail}`}
      </span>
      {/* One label for the whole grid, floated over the day picked. */}
      <Tooltip.Root open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <Tooltip.Portal>
          <Tooltip.Positioner anchor={picked?.cell} side="top" sideOffset={6} className="z-50">
            <Tooltip.Popup className="pointer-events-none flex data-closed:hidden flex-col rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md">
              <span className="font-medium">{date}</span>
              <span className="tabular-nums opacity-80">{detail}</span>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </>
  );
}

// Hides every amount in the app at once, for when someone could see the screen.
function HideAmountsButton() {
  const store = useStore();
  const Icon = store.hidden ? EyeOffIcon : EyeIcon;
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={store.hidden ? "Mostrar cantidades" : "Ocultar cantidades"}
      aria-pressed={store.hidden}
      title={store.hidden ? "Mostrar cantidades" : "Ocultar cantidades"}
      onClick={store.toggleHidden}
    >
      <Icon />
    </Button>
  );
}

// Page title with an optional muted line above it, actions and the hide-amounts toggle on the right.
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <span className="text-[0.8125rem] text-muted-foreground">{eyebrow}</span>}
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight md:text-[28px]">
          {title}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <HideAmountsButton />
      </div>
    </div>
  );
}

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-my-1.5 inline-flex shrink-0 items-center gap-0.5 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap text-primary hover:text-accent-foreground"
    >
      {children}
      <ChevronRightIcon className="size-3.5" />
    </Link>
  );
}

// Label over a big number: KPI strips and summary cards.
export function Stat({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="truncate text-[0.8125rem] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// Centered icon, title, hint and actions for lists and pages with nothing to show yet.
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: typeof LandmarkIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-6" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-heading text-lg leading-tight font-semibold tracking-tight">{title}</p>
        {children && <p className="text-sm text-muted-foreground">{children}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

// "‹ Octubre de 2026 ›": steps a month back or forward, never past `max` (this month) or `min`.
export function MonthPicker({
  month,
  onChange,
  min,
  max,
}: {
  month: string;
  onChange: (month: string) => void;
  min?: string;
  max: string;
}) {
  return (
    <div className="flex h-9 items-center rounded-md border border-input bg-card px-1 text-sm font-medium">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Mes anterior"
        disabled={!!min && month <= min}
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeftIcon className="text-muted-foreground" />
      </Button>
      <span className="w-32 text-center">{monthName(month)}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Mes siguiente"
        disabled={month >= max}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRightIcon className="text-muted-foreground" />
      </Button>
    </div>
  );
}

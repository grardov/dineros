"use client";

import {
  BanknoteIcon,
  ChevronRightIcon,
  CreditCardIcon,
  LandmarkIcon,
  PiggyBankIcon,
  TrendingUpIcon,
} from "lucide-react";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { findInstitution } from "@/lib/institutions";
import { useStore } from "@/lib/store";
import { type Account, type AccountType, MINUS, money, signedMoney } from "@/lib/types";
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
  const s = (value < 0 ? MINUS : "") + money(Math.abs(value), currency);
  const dot = s.lastIndexOf(".");
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
          {signedMoney(change.delta, props.currency)}
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

// Page title with an optional muted line above it and actions on the right.
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
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-0.5 text-[0.8125rem] font-medium whitespace-nowrap text-primary hover:text-accent-foreground"
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
      <span className="text-[0.8125rem] text-muted-foreground">{label}</span>
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

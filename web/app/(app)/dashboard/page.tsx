"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ReceiptTextIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AccountDialog } from "@/components/account-dialog";
import { useCategory } from "@/components/category-icon";
import {
  AccountTile,
  Amount,
  CountUpAmount,
  EmptyState,
  MoreLink,
  PageHeader,
  SpendingGrid,
  Stat,
  UtilizationBar,
  addDays,
  capitalize,
  dayMonth,
  monthName,
  shiftMonth,
  useCredit,
} from "@/components/finance";
import { FijosCard } from "@/components/recurring";
import { NewTransactionButton, TransactionRows } from "@/components/transaction-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { ACCOUNT_TYPES, type Account } from "@/lib/types";

import { HealthCard } from "../health/card";

// "+3.2% vs septiembre"; for spending, going down is the good direction.
function Delta({
  now,
  before,
  label,
  lowerIsBetter = false,
}: {
  now: number;
  before: number;
  label: string;
  lowerIsBetter?: boolean;
}) {
  if (!before)
    return <span className="truncate text-xs text-muted-foreground">Sin datos de {label}</span>;
  const pct = ((now - before) / before) * 100;
  const good = lowerIsBetter ? pct <= 0 : pct >= 0;
  return (
    <span className={`truncate text-xs font-medium ${good ? "text-income" : "text-expense"}`}>
      {pct >= 0 ? "+" : "−"}
      {Math.abs(pct).toFixed(1)}% vs {label}
    </span>
  );
}

function CategoryRow({
  id,
  amount,
  total,
  max,
}: {
  id: string | null;
  amount: number;
  total: number;
  max: number;
}) {
  const store = useStore();
  const { category, tone, icon } = useCategory(id);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[0.8125rem]">
        <span aria-hidden>{icon ?? "·"}</span>
        <span className="truncate font-medium">{category?.name ?? "Sin categoría"}</span>
        <span className="ml-auto font-semibold tabular-nums">{store.money(amount)}</span>
        <span className="w-9 text-right text-xs text-subtle tabular-nums">
          {Math.round((amount / total) * 100)}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${(amount / max) * 100}%`, background: tone.chart }}
        />
      </div>
    </div>
  );
}

function AccountRow({ account }: { account: Account }) {
  const store = useStore();
  const credit = useCredit(account);
  const isCredit = account.type === "credit";
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="-mx-2 flex flex-col gap-1.5 rounded-md border-t border-muted px-2 py-2 first:border-t-0 hover:bg-sidebar"
    >
      <div className="flex items-center gap-2.5">
        <AccountTile account={account} className="size-7 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[0.84rem] font-medium">{account.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {isCredit
              ? credit.due
                ? `Pago ${dayMonth(credit.due.due_date)}`
                : `Corte ${account.statement_day} · Pago ${account.payment_due_day}`
              : ACCOUNT_TYPES[account.type]}
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {store.signedMoney(store.balance(account.id), account.currency, false)}
        </span>
      </div>
      {isCredit && account.credit_limit && (
        <UtilizationBar pct={credit.utilization} className="ml-[38px] h-1" />
      )}
    </Link>
  );
}

export default function Home() {
  const store = useStore();
  const thisMonth = store.today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const prev = shiftMonth(month, -1);

  const inMonth = (ym: string) => store.transactions.filter((t) => t.occurred_on.startsWith(ym));
  const totals = (ym: string) => {
    const txs = inMonth(ym);
    const sum = (k: string) => txs.filter((t) => t.kind === k).reduce((s, t) => s + t.amount, 0);
    return { income: sum("income"), expense: sum("expense") };
  };
  const now = totals(month);
  const before = totals(prev);
  const saved = now.income - now.expense;
  const monthTxs = inMonth(month);

  const accounts = store.accounts.filter((a) => !a.archived_at);
  const balances = accounts.map((a) => store.balance(a.id));
  const assets = balances.filter((b) => b > 0).reduce((s, b) => s + b, 0);
  const debts = balances.filter((b) => b < 0).reduce((s, b) => s + b, 0);

  // Spending by top-level category: a subcategory's spending counts toward its parent.
  const byCategory = new Map<string | null, number>();
  for (const t of monthTxs.filter((t) => t.kind === "expense")) {
    const c = store.category(t.category_id);
    const root = c?.parent_id ?? c?.id ?? null;
    byCategory.set(root, (byCategory.get(root) ?? 0) + t.amount);
  }
  const topCategories = [...byCategory].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCategory = topCategories[0]?.[1] ?? 0;

  const firstName = store.profile.display_name?.split(/\s+/)[0];
  const todayLong =
    (firstName ? `Hola, ${firstName} · ` : "") +
    capitalize(
      new Date(`${store.today}T00:00:00`).toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );

  if (!store.accounts.length)
    return (
      <>
        <PageHeader eyebrow={todayLong} title="Resumen" />
        <Card>
          <EmptyState
            icon={WalletIcon}
            title="Te damos la bienvenida a Dineros"
            action={
              <Button size="lg" onClick={() => setCreatingAccount(true)}>
                <PlusIcon /> Agregar mi primera cuenta
              </Button>
            }
          >
            Empieza agregando tus cuentas: débito, efectivo, ahorro o tarjetas de crédito. Después
            registra tus movimientos y aquí verás tu patrimonio, tus gastos y tu ahorro del mes.
          </EmptyState>
        </Card>
        {creatingAccount && <AccountDialog open onClose={() => setCreatingAccount(false)} />}
      </>
    );

  return (
    <>
      <PageHeader eyebrow={todayLong} title="Resumen">
        <div className="flex h-9 items-center rounded-md border border-input bg-card px-1 text-sm font-medium">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mes anterior"
            onClick={() => setMonth(prev)}
          >
            <ChevronLeftIcon className="text-muted-foreground" />
          </Button>
          <span className="w-32 text-center">{monthName(month)}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mes siguiente"
            disabled={month >= thisMonth}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRightIcon className="text-muted-foreground" />
          </Button>
        </div>
        <NewTransactionButton className="max-md:hidden" />
      </PageHeader>

      {/* Every figure gets the same width, four in a row only where Gastos del mes has room for
          its amount and the month's days side by side. Text that doesn't fit is cut short. */}
      <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 2xl:grid-cols-4">
        <Card className="max-md:border-0 max-md:bg-primary max-md:text-primary-foreground">
          <CardContent>
            <Stat
              label={<span className="max-md:text-primary-foreground/80">Patrimonio neto</span>}
            >
              <CountUpAmount
                value={assets + debts}
                className="text-[28px] leading-none min-[375px]:text-[34px] md:text-[26px]"
                centsClassName="text-subtle max-md:text-primary-foreground/60"
                deltaClassName="max-md:text-primary-foreground"
              />
              <span className="truncate text-xs text-muted-foreground max-md:text-primary-foreground/80">
                Activos {store.money(assets)} · Deudas {store.signedMoney(debts, "MXN", false)}
              </span>
            </Stat>
          </CardContent>
        </Card>
        <HealthCard month={month} />
        <Card>
          {/* The month's days sit beside the amount, and step aside when there's no room for both. */}
          <CardContent className="@container flex items-end justify-between gap-3">
            <Stat label="Gastos del mes">
              <Amount
                value={now.expense}
                className="text-lg leading-none text-expense sm:text-xl md:text-[26px]"
                centsClassName="opacity-55"
              />
              <Delta
                now={now.expense}
                before={before.expense}
                label={monthName(prev, false).toLowerCase()}
                lowerIsBetter
              />
            </Stat>
            <div className="hidden shrink-0 @min-[13.5rem]:block">
              <SpendingGrid
                from={`${month}-01`}
                to={addDays(`${shiftMonth(month, 1)}-01`, -1)}
                label={`Gasto variable por día en ${monthName(month, false).toLowerCase()}`}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stat label="Ahorro del mes">
              <Amount value={saved} className="text-xl leading-none md:text-[26px]" />
              <div className="flex items-center gap-2">
                <div className="h-[5px] min-w-12 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${now.income ? Math.max(0, Math.min(100, (saved / now.income) * 100)) : 0}%`,
                    }}
                  />
                </div>
                <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  {saved >= 0 ? (
                    <TrendingUpIcon className="size-3.5" />
                  ) : (
                    <TrendingDownIcon className="size-3.5 text-expense" />
                  )}
                  <span className="truncate">
                    {now.income
                      ? `${((saved / now.income) * 100).toFixed(1)}% de ${store.money(now.income)}`
                      : "Sin ingresos"}
                  </span>
                </span>
              </div>
            </Stat>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card className="gap-1 pb-1">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Movimientos recientes</CardTitle>
            <MoreLink href="/transactions">Ver todos</MoreLink>
          </CardHeader>
          <TransactionRows
            transactions={monthTxs.slice(0, 7)}
            grouped={false}
            empty={
              store.transactions.length ? (
                `Sin movimientos en ${monthName(month, false).toLowerCase()}.`
              ) : (
                <EmptyState
                  icon={ReceiptTextIcon}
                  title="Aún no hay movimientos"
                  action={<NewTransactionButton />}
                >
                  Registra tu primer gasto o ingreso para ver tu resumen del mes.
                </EmptyState>
              )
            }
          />
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Gastos por categoría</CardTitle>
              <MoreLink href="/categories">Ver todo</MoreLink>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {topCategories.length ? (
                topCategories.map(([id, amount]) => (
                  <CategoryRow
                    key={id ?? "none"}
                    id={id}
                    amount={amount}
                    total={now.expense}
                    max={maxCategory}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin gastos este mes.</p>
              )}
            </CardContent>
          </Card>
          <FijosCard />
          <Card className="gap-2">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Cuentas</CardTitle>
              <MoreLink href="/accounts">Administrar</MoreLink>
            </CardHeader>
            <CardContent className="flex flex-col">
              {accounts.length ? (
                accounts.map((a) => <AccountRow key={a.id} account={a} />)
              ) : (
                <p className="text-sm text-muted-foreground">Todas tus cuentas están archivadas.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

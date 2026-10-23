"use client";

import { ArchiveIcon, ChevronDownIcon, PlusIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AccountDialog } from "@/components/account-dialog";
import {
  AccountTile,
  Amount,
  EmptyState,
  PageHeader,
  Stat,
  UtilizationBar,
  dayMonth,
  useCredit,
} from "@/components/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { ACCOUNT_TYPES, type Account, type AccountType, money, signedMoney } from "@/lib/types";

const GROUPS: [string, AccountType[]][] = [
  ["Débito y efectivo", ["debit", "cash"]],
  ["Ahorro e inversión", ["savings", "investment"]],
  ["Tarjetas de crédito", ["credit"]],
];

function AccountCard({ account }: { account: Account }) {
  const store = useStore();
  const credit = useCredit(account);
  const isCredit = account.type === "credit";
  return (
    <Link href={`/accounts/${account.id}`}>
      <Card
        className={`h-full gap-3.5 p-4 transition-colors hover:border-primary/40 ${account.archived_at ? "opacity-60" : ""}`}
      >
        <div className="flex items-center gap-2.5">
          <AccountTile account={account} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{account.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {isCredit
                ? `Crédito · corte ${account.statement_day} · pago ${account.payment_due_day}`
                : [ACCOUNT_TYPES[account.type], account.institution].filter(Boolean).join(" · ")}
            </span>
          </div>
          {account.archived_at && <Badge variant="muted">Archivada</Badge>}
        </div>
        <div className="flex items-end justify-between gap-2">
          <Stat label={isCredit ? "Debes" : "Saldo"}>
            <Amount
              value={isCredit ? credit.debt : store.balance(account.id)}
              currency={account.currency}
              className="text-[22px] leading-none"
            />
          </Stat>
          {credit.available !== null && (
            <Stat label="Disponible" className="text-right">
              <span className="text-sm font-semibold tabular-nums">
                {money(credit.available, account.currency)}
              </span>
            </Stat>
          )}
        </div>
        {isCredit && account.credit_limit && (
          <div className="flex flex-col gap-1.5">
            <UtilizationBar pct={credit.utilization} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{credit.utilization}% usado</span>
              {credit.due && (
                <span
                  className={
                    credit.dueInDays! <= 5 ? "font-medium text-warning" : "text-muted-foreground"
                  }
                >
                  Pago {dayMonth(credit.due.due_date)} · en {credit.dueInDays} días
                </span>
              )}
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}

export default function AccountsPage() {
  const store = useStore();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const active = store.accounts.filter((a) => !a.archived_at);
  const archived = store.accounts.filter((a) => a.archived_at);
  const balances = active.map((a) => store.balance(a.id));
  const assets = balances.filter((b) => b > 0).reduce((s, b) => s + b, 0);
  const debts = balances.filter((b) => b < 0).reduce((s, b) => s + b, 0);

  return (
    <>
      <PageHeader title="Cuentas">
        <Button onClick={() => setCreating(true)}>
          <PlusIcon /> Nueva cuenta
        </Button>
      </PageHeader>

      {!active.length && (
        <Card>
          <EmptyState
            icon={WalletIcon}
            title={archived.length ? "No tienes cuentas activas" : "Aún no tienes cuentas"}
            action={
              <Button onClick={() => setCreating(true)}>
                <PlusIcon /> Nueva cuenta
              </Button>
            }
          >
            {archived.length
              ? "Tus cuentas archivadas están abajo. Desarchiva una o agrega una nueva."
              : "Agrega tu cuenta de débito, efectivo, ahorro, inversión o tarjeta de crédito para empezar a llevar tus finanzas."}
          </EmptyState>
        </Card>
      )}

      {active.length > 0 && (
        <Card className="grid grid-cols-1 gap-0 p-0 sm:grid-cols-3">
          {[
            ["Activos", <Amount key="a" value={assets} className="text-2xl leading-none" />],
            [
              "Deudas de tarjetas",
              <span
                key="d"
                className="text-2xl leading-none font-semibold text-expense tabular-nums"
              >
                {signedMoney(debts, "MXN", false)}
              </span>,
            ],
            [
              "Patrimonio neto",
              <Amount key="n" value={assets + debts} className="text-2xl leading-none" />,
            ],
          ].map(([label, value], i) => (
            <Stat
              key={i}
              label={label}
              className="border-muted px-5.5 py-4.5 max-sm:border-b sm:border-r sm:last:border-r-0"
            >
              {value}
            </Stat>
          ))}
        </Card>
      )}

      {GROUPS.map(([title, types]) => {
        const group = active.filter((a) => types.includes(a.type));
        if (!group.length) return null;
        const total = group.reduce((s, a) => s + store.balance(a.id), 0);
        return (
          <section key={title} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base leading-tight font-semibold tracking-tight">
                {title}{" "}
                <span className="font-sans text-[0.8125rem] font-normal text-subtle">
                  {group.length}
                </span>
              </h2>
              <span className="text-[0.8125rem] font-semibold text-sidebar-foreground tabular-nums">
                {signedMoney(total, "MXN", false)}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((a) => (
                <AccountCard key={a.id} account={a} />
              ))}
            </div>
          </section>
        );
      })}

      {archived.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            aria-expanded={showArchived}
            className="flex items-center gap-2 self-start px-0.5 text-[0.8125rem] text-muted-foreground hover:text-foreground"
          >
            <ArchiveIcon className="size-4" />
            {archived.length} cuenta{archived.length === 1 ? "" : "s"} archivada
            {archived.length === 1 ? "" : "s"}
            <ChevronDownIcon
              className={`size-3.5 transition-transform ${showArchived ? "rotate-180" : ""}`}
            />
          </button>
          {showArchived && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map((a) => (
                <AccountCard key={a.id} account={a} />
              ))}
            </div>
          )}
        </section>
      )}

      {creating && <AccountDialog open onClose={() => setCreating(false)} />}
    </>
  );
}

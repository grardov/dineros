"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftRightIcon,
  ChevronRightIcon,
  PencilIcon,
  ReceiptTextIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";

import { AccountDialog } from "@/components/account-dialog";
import {
  AccountTile,
  Amount,
  EmptyState,
  PageHeader,
  Stat,
  UtilizationBar,
  dayMonth,
  daysUntil,
  useCredit,
} from "@/components/finance";
import { NewTransactionButton, TransactionRows } from "@/components/transaction-list";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveAccount } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { ACCOUNT_TYPES, type Account, type CreditCardStatement, shortDate } from "@/lib/types";

function StatementBadge({ s, today }: { s: CreditCardStatement; today: string }) {
  if (!s.is_closed) return <Badge variant="outline">En curso</Badge>;
  if (s.pending === 0) return <Badge variant="income">Pagado</Badge>;
  if (s.due_date < today) return <Badge variant="expense">Vencido</Badge>;
  return <Badge variant="warning">Por pagar</Badge>;
}

function CreditSummary({ account }: { account: Account }) {
  const store = useStore();
  const { debt, available, utilization } = useCredit(account);
  const statements = store.statements(account);
  const open = statements.find((s) => !s.is_closed);
  const last = statements.find((s) => s.is_closed);
  const cur = account.currency;
  const days = last ? daysUntil(store.today, last.due_date) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <Stat label="Saldo actual (debes)">
              <Amount value={debt} currency={cur} className="text-[34px] leading-none" />
            </Stat>
            {available !== null && (
              <Stat label="Disponible" className="text-right">
                <Amount
                  value={available}
                  currency={cur}
                  className="text-[17px]"
                  centsClassName=""
                />
              </Stat>
            )}
          </div>
          {account.credit_limit && (
            <div className="flex flex-col gap-1.5">
              <UtilizationBar pct={utilization} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{utilization}% de tu línea</span>
                <span>
                  Límite{" "}
                  <Amount
                    value={account.credit_limit}
                    currency={cur}
                    className="font-normal"
                    centsClassName=""
                  />
                </span>
              </div>
            </div>
          )}
          {open && (
            <div className="grid grid-cols-2 gap-2.5 border-t border-muted pt-3 text-[0.8125rem]">
              <Stat label="Periodo en curso" className="gap-0.5">
                <b className="tabular-nums">
                  {dayMonth(open.period_start)} – {dayMonth(open.statement_date)}
                </b>
              </Stat>
              <Stat label="Cargos del periodo" className="gap-0.5">
                <Amount value={open.charges} currency={cur} centsClassName="" />
              </Stat>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        {last ? (
          <>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Estado de cuenta · corte {dayMonth(last.statement_date)}</CardTitle>
              {last.pending > 0 && days >= 0 ? (
                <Badge variant="warning">
                  Vence el {dayMonth(last.due_date)} · en {days} días
                </Badge>
              ) : (
                <StatementBadge s={last} today={store.today} />
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3.5">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1 rounded-lg border border-[#c9ddd7] bg-[#f3f8f6] p-3">
                  <span className="text-xs text-accent-foreground">Para no generar intereses</span>
                  <Amount
                    value={last.statement_balance}
                    currency={cur}
                    className="text-[0.9375rem] text-accent-foreground"
                    centsClassName=""
                  />
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-background p-3">
                  <span className="text-xs text-muted-foreground">Pagado</span>
                  <Amount
                    value={last.payments}
                    currency={cur}
                    className="text-[0.9375rem]"
                    centsClassName=""
                  />
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-background p-3">
                  <span className="text-xs text-muted-foreground">Te faltan</span>
                  <Amount
                    value={last.pending}
                    currency={cur}
                    className="text-[0.9375rem]"
                    centsClassName=""
                  />
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-[#3a9a6c]"
                  style={{
                    width: `${last.statement_balance > 0 ? Math.min(100, (last.payments / last.statement_balance) * 100) : 100}%`,
                  }}
                />
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="text-sm text-muted-foreground">
            Aún no hay un corte cerrado. El primero será el{" "}
            {shortDate(open?.statement_date ?? store.today)}.
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const [editingAccount, setEditingAccount] = useState(false);
  const [archiving, startArchiving] = useTransition();
  const account = store.account(id);

  if (!account)
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-muted-foreground">Esta cuenta no existe.</p>
        <Link href="/accounts" className={buttonVariants({ variant: "outline" })}>
          Volver a cuentas
        </Link>
      </div>
    );

  const credit = account.type === "credit";
  const transactions = store.transactions.filter(
    (t) => t.account_id === id || t.to_account_id === id,
  );

  return (
    <>
      <nav className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
        <Link href="/accounts" className="hover:text-foreground">
          Cuentas
        </Link>
        <ChevronRightIcon className="size-3.5" />
        <span className="text-foreground">{account.name}</span>
      </nav>

      <PageHeader
        title={
          <span className="flex items-center gap-3.5">
            <AccountTile account={account} className="size-12 rounded-xl" />
            <span className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                {account.name}
                {account.archived_at && <Badge variant="muted">Archivada</Badge>}
              </span>
              <span className="font-sans text-[0.8125rem] font-normal tracking-normal text-muted-foreground">
                {[
                  credit ? "Tarjeta de crédito" : ACCOUNT_TYPES[account.type],
                  account.institution,
                  account.currency,
                  credit && `Corte día ${account.statement_day}`,
                  credit && `Pago día ${account.payment_due_day}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </span>
        }
      >
        <Button
          variant="ghost"
          disabled={archiving}
          onClick={() => {
            const archived_at = account.archived_at ? null : new Date().toISOString();
            startArchiving(
              async () => void (await saveAccount(account.id, { ...account, archived_at })),
            );
          }}
        >
          {account.archived_at ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
          {account.archived_at ? "Desarchivar" : "Archivar"}
        </Button>
        <Button variant="outline" onClick={() => setEditingAccount(true)}>
          <PencilIcon /> Editar
        </Button>
        {credit ? (
          <NewTransactionButton kind="transfer" toAccountId={account.id}>
            <ArrowLeftRightIcon /> Pagar tarjeta
          </NewTransactionButton>
        ) : (
          <NewTransactionButton accountId={account.id} className="max-md:hidden" />
        )}
      </PageHeader>

      {credit ? (
        <CreditSummary account={account} />
      ) : (
        <Card className="grid grid-cols-3 gap-0 p-0">
          {[
            [
              "Saldo",
              <Amount
                key="b"
                value={store.balance(account.id)}
                currency={account.currency}
                className="text-xl leading-none md:text-2xl"
              />,
            ],
            [
              "Saldo inicial",
              <Amount
                key="o"
                value={account.opening_balance}
                currency={account.currency}
                className="text-xl leading-none md:text-2xl"
              />,
            ],
            [
              "Movimientos",
              <span key="n" className="text-xl leading-none font-semibold tabular-nums md:text-2xl">
                {transactions.length}
              </span>,
            ],
          ].map(([label, value], i) => (
            <Stat
              key={i}
              label={label}
              className="border-r border-muted px-4 py-4 last:border-r-0 md:px-5.5 md:py-4.5"
            >
              {value}
            </Stat>
          ))}
        </Card>
      )}

      <Tabs defaultValue="movimientos" className="gap-4">
        {credit && (
          <TabsList variant="line" className="w-full justify-start gap-5 border-b">
            <TabsTrigger value="movimientos" className="flex-none px-0">
              Movimientos
            </TabsTrigger>
            <TabsTrigger value="estados" className="flex-none px-0">
              Estados de cuenta
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="movimientos">
          <Card className="py-0">
            <TransactionRows
              transactions={transactions}
              accountId={id}
              empty={
                <EmptyState
                  icon={ReceiptTextIcon}
                  title="Sin movimientos todavía"
                  action={<NewTransactionButton accountId={account.id} />}
                >
                  {credit
                    ? "Las compras y los pagos de esta tarjeta aparecerán aquí."
                    : "Los gastos, ingresos y transferencias de esta cuenta aparecerán aquí."}
                </EmptyState>
              }
            />
          </Card>
        </TabsContent>
        {credit && (
          <TabsContent value="estados">
            <Card className="py-0">
              <Table>
                <TableHeader className="bg-sidebar">
                  <TableRow>
                    <TableHead className="pl-4">Periodo</TableHead>
                    <TableHead>Fecha límite</TableHead>
                    <TableHead className="text-right">Cargos</TableHead>
                    <TableHead className="text-right">Saldo al corte</TableHead>
                    <TableHead className="text-right">Pagos</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="pr-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!store.statements(account).length && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Aún no hay estados de cuenta.
                      </TableCell>
                    </TableRow>
                  )}
                  {store.statements(account).map((s) => {
                    const cur = (n: number) => (
                      <Amount
                        value={n}
                        currency={account.currency}
                        className="font-normal"
                        centsClassName=""
                      />
                    );
                    return (
                      <TableRow key={s.statement_date}>
                        <TableCell className="pl-4">
                          {dayMonth(s.period_start)} – {shortDate(s.statement_date)}
                        </TableCell>
                        <TableCell>{shortDate(s.due_date)}</TableCell>
                        <TableCell className="text-right">{cur(s.charges)}</TableCell>
                        <TableCell className="text-right">
                          {s.is_closed ? cur(s.statement_balance) : "—"}
                        </TableCell>
                        <TableCell className="text-right">{cur(s.payments)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {s.is_closed ? cur(s.pending) : "—"}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <StatementBadge s={s} today={store.today} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {editingAccount && (
        <AccountDialog account={account} open onClose={() => setEditingAccount(false)} />
      )}
    </>
  );
}

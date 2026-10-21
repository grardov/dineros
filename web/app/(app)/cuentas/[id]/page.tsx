"use client";

import { ArchiveIcon, ArchiveRestoreIcon, ArrowLeftIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AccountDialog } from "@/components/account-dialog";
import { TransactionList } from "@/components/transaction-list";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/store";
import { ACCOUNT_TYPES, money, shortDate } from "@/lib/types";

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const [editingAccount, setEditingAccount] = useState(false);
  const account = store.account(id);

  if (!account)
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-muted-foreground">Esta cuenta no existe.</p>
        <Link href="/cuentas" className={buttonVariants({ variant: "outline" })}>
          Volver a cuentas
        </Link>
      </div>
    );

  const credit = account.type === "credit";
  const balance = store.balance(account.id);
  const available = store.availableCredit(account);
  const transactions = store.transactions.filter(
    (t) => t.account_id === id || t.to_account_id === id,
  );
  const cur = (n: number) => money(n, account.currency);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/cuentas"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" /> Cuentas
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            {account.name}
            {account.archived_at && <Badge variant="outline">Archivada</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[ACCOUNT_TYPES[account.type], account.institution, account.currency]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() =>
              store.saveAccount({
                ...account,
                archived_at: account.archived_at ? null : new Date().toISOString(),
              })
            }
          >
            {account.archived_at ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            {account.archived_at ? "Desarchivar" : "Archivar"}
          </Button>
          <Button variant="outline" onClick={() => setEditingAccount(true)}>
            <PencilIcon /> Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(credit
          ? [
              { label: "Deuda actual", value: cur(-balance) },
              { label: "Crédito disponible", value: available === null ? "—" : cur(available) },
              {
                label: "Límite",
                value: account.credit_limit === null ? "—" : cur(account.credit_limit),
              },
            ]
          : [
              { label: "Saldo", value: cur(balance) },
              { label: "Saldo inicial", value: cur(account.opening_balance) },
              { label: "Movimientos", value: String(transactions.length) },
            ]
        ).map(({ label, value }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {credit && (
        <Card>
          <CardHeader>
            <CardTitle>Cortes</CardTitle>
            <CardDescription>
              Corte el día {account.statement_day}, pago límite el día {account.payment_due_day}. El
              saldo al corte es el pago para no generar intereses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Fecha límite</TableHead>
                  <TableHead className="text-right">Cargos</TableHead>
                  <TableHead className="text-right">Saldo al corte</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.statements(account).map((s) => (
                  <TableRow key={s.statement_date}>
                    <TableCell>
                      {shortDate(s.period_start)} – {shortDate(s.statement_date)}
                    </TableCell>
                    <TableCell>{shortDate(s.due_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{cur(s.charges)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.is_closed ? cur(s.statement_balance) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{cur(s.payments)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {s.is_closed ? cur(s.pending) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {!s.is_closed ? (
                        <Badge variant="outline">En curso</Badge>
                      ) : s.pending === 0 ? (
                        <Badge variant="secondary">Pagado</Badge>
                      ) : s.due_date < store.today ? (
                        <Badge variant="destructive">Vencido</Badge>
                      ) : (
                        <Badge>Por pagar</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <TransactionList level={2} title="Movimientos" transactions={transactions} accountId={id} />

      {editingAccount && (
        <AccountDialog account={account} open onClose={() => setEditingAccount(false)} />
      )}
    </>
  );
}

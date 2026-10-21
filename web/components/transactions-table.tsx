"use client";

import { ArrowRightIcon, MapPinIcon } from "lucide-react";

import { TransactionIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/store";
import { money, shortDate, type Transaction } from "@/lib/types";

// Signed from the point of view of `accountId` when given: a transfer is money out of one account
// and into the other.
function signed(t: Transaction, accountId?: string) {
  if (t.kind === "income") return t.amount;
  if (t.kind === "expense") return -t.amount;
  if (!accountId) return null;
  return t.to_account_id === accountId ? t.amount : -t.amount;
}

export function TransactionsTable({
  transactions,
  accountId,
  onSelect,
}: {
  transactions: Transaction[];
  accountId?: string;
  onSelect: (t: Transaction) => void;
}) {
  const store = useStore();
  if (!transactions.length)
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden w-28 sm:table-cell">Fecha</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead className="hidden lg:table-cell">Categoría</TableHead>
          <TableHead className="hidden lg:table-cell">Cuenta</TableHead>
          <TableHead className="text-right">Monto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => {
          const amount = signed(t, accountId);
          const account = store.account(t.account_id)!;
          const to = store.account(t.to_account_id);
          const category = store.category(t.category_id);
          return (
            <TableRow
              key={t.id}
              tabIndex={0}
              className="cursor-pointer"
              onClick={() => onSelect(t)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(t)}
            >
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {shortDate(t.occurred_on)}
              </TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex items-center gap-3">
                  <TransactionIcon transaction={t} />
                  <div className="min-w-0">
                    <div className="font-medium">
                      {t.description ??
                        category?.name ??
                        (t.kind === "transfer" ? "Transferencia" : "—")}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span className="sm:hidden">{shortDate(t.occurred_on)} ·</span>
                      <span className="lg:hidden">{category?.name ?? account.name}</span>
                      {t.location_name && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPinIcon className="size-3" />
                          {t.location_name}
                        </span>
                      )}
                      {t.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {category?.name ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {to ? (
                  <span className="inline-flex items-center gap-1">
                    {account.name} <ArrowRightIcon className="size-3" /> {to.name}
                  </span>
                ) : (
                  account.name
                )}
              </TableCell>
              <TableCell
                className={`text-right font-medium tabular-nums ${
                  amount === null ? "" : amount > 0 ? "text-emerald-600" : "text-foreground"
                }`}
              >
                {amount === null
                  ? money(t.amount)
                  : `${amount > 0 ? "+" : "−"}${money(Math.abs(amount))}`}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

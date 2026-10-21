"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { TransactionDialog } from "@/components/transaction-dialog";
import { TransactionsTable } from "@/components/transactions-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Transaction } from "@/lib/types";

// Heading + "new" button + table + create/edit dialog, shared by every page that lists movements.
export function TransactionList({
  title,
  description,
  transactions,
  accountId,
  level = 1,
}: {
  title: string;
  description?: string;
  transactions: Transaction[];
  accountId?: string;
  level?: 1 | 2;
}) {
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Heading className={level === 1 ? "text-2xl font-semibold" : "text-lg font-semibold"}>
            {title}
          </Heading>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button onClick={() => setEditing("new")}>
          <PlusIcon /> Movimiento
        </Button>
      </div>
      <Card>
        <CardContent>
          <TransactionsTable
            transactions={transactions}
            accountId={accountId}
            onSelect={setEditing}
          />
        </CardContent>
      </Card>
      {editing && (
        <TransactionDialog
          transaction={editing === "new" ? undefined : editing}
          accountId={accountId}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

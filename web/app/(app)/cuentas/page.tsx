"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AccountDialog } from "@/components/account-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { ACCOUNT_TYPES, money, type AccountType } from "@/lib/types";

export default function AccountsPage() {
  const store = useStore();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const accounts = store.accounts.filter((a) => showArchived || !a.archived_at);
  const archivedCount = store.accounts.filter((a) => a.archived_at).length;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Cuentas</h1>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Button variant="ghost" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? "Ocultar archivadas" : `Ver archivadas (${archivedCount})`}
            </Button>
          )}
          <Button onClick={() => setCreating(true)}>
            <PlusIcon /> Cuenta
          </Button>
        </div>
      </div>

      {(Object.keys(ACCOUNT_TYPES) as AccountType[]).map((type) => {
        const group = accounts.filter((a) => a.type === type);
        if (!group.length) return null;
        return (
          <section key={type} className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">{ACCOUNT_TYPES[type]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((a) => {
                const balance = store.balance(a.id);
                const available = store.availableCredit(a);
                return (
                  <Link key={a.id} href={`/cuentas/${a.id}`}>
                    <Card
                      className={`h-full transition-colors hover:bg-muted/50 ${a.archived_at ? "opacity-60" : ""}`}
                    >
                      <CardHeader>
                        <CardDescription className="flex items-center gap-2">
                          {a.institution ?? ACCOUNT_TYPES[a.type]}
                          {a.archived_at && <Badge variant="outline">Archivada</Badge>}
                        </CardDescription>
                        <CardTitle>{a.name}</CardTitle>
                        <div className="mt-2 text-2xl font-semibold tabular-nums">
                          {money(type === "credit" ? -balance : balance, a.currency)}
                        </div>
                        {type === "credit" && (
                          <div className="text-xs text-muted-foreground">
                            Deuda · corte día {a.statement_day}, pago día {a.payment_due_day}
                            {available !== null && (
                              <>
                                <br />
                                Disponible {money(available, a.currency)} de{" "}
                                {money(a.credit_limit!, a.currency)}
                              </>
                            )}
                          </div>
                        )}
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {creating && <AccountDialog open onClose={() => setCreating(false)} />}
    </>
  );
}

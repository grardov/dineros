"use client";

import { ArrowLeftRightIcon, ReceiptTextIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { EmptyState, PageHeader } from "@/components/finance";
import { NewTransactionButton, TransactionRows } from "@/components/transaction-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { signedMoney, type TransactionKind } from "@/lib/types";

const KINDS = { all: "Todos", expense: "Gastos", income: "Ingresos", transfer: "Transferencias" };

export default function TransactionsPage() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<TransactionKind | "all">("all");
  const [accountId, setAccountId] = useState("");

  const q = query.trim().toLowerCase();
  const transactions = store.transactions.filter(
    (t) =>
      (kind === "all" || t.kind === kind) &&
      (!accountId || t.account_id === accountId || t.to_account_id === accountId) &&
      (!q ||
        [
          t.description,
          t.notes,
          t.location_name,
          store.category(t.category_id)?.name,
          ...t.tags,
        ].some((s) => s?.toLowerCase().includes(q))),
  );
  const total = (k: TransactionKind) =>
    transactions.filter((t) => t.kind === k).reduce((s, t) => s + t.amount, 0);
  const income = total("income");
  const expense = total("expense");
  const clearFilters = () => {
    setQuery("");
    setKind("all");
    setAccountId("");
  };

  const actions = (
    <>
      <NewTransactionButton variant="outline" kind="transfer">
        <ArrowLeftRightIcon /> Transferir
      </NewTransactionButton>
      <NewTransactionButton className="max-md:hidden" />
    </>
  );

  if (!store.transactions.length)
    return (
      <>
        <PageHeader title="Movimientos">{actions}</PageHeader>
        <Card>
          <EmptyState
            icon={ReceiptTextIcon}
            title="Aún no hay movimientos"
            action={<NewTransactionButton />}
          >
            Registra tus gastos, ingresos y transferencias entre cuentas. Aquí podrás buscarlos y
            filtrarlos.
          </EmptyState>
        </Card>
      </>
    );

  return (
    <>
      <PageHeader
        eyebrow={`${transactions.length} movimiento${transactions.length === 1 ? "" : "s"}`}
        title="Movimientos"
      >
        {actions}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar descripción, nota o etiqueta"
            className="pl-9"
          />
        </label>
        <Tabs
          value={kind}
          onValueChange={(v) => setKind(v as typeof kind)}
          className="max-sm:w-full"
        >
          <TabsList className="max-sm:w-full">
            {Object.entries(KINDS).map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-3 text-[0.8125rem] max-[359px]:px-2 max-[359px]:text-xs"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <NativeSelect
          aria-label="Cuenta"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-44"
        >
          <NativeSelectOption value="">Todas las cuentas</NativeSelectOption>
          {store.accounts.map((a) => (
            <NativeSelectOption key={a.id} value={a.id}>
              {a.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-7 gap-y-1 px-0.5 text-[0.8125rem] text-muted-foreground">
        <span>
          Ingresos{" "}
          <b className="text-[0.9375rem] text-income tabular-nums">{signedMoney(income)}</b>
        </span>
        <span>
          Gastos{" "}
          <b className="text-[0.9375rem] text-expense tabular-nums">{signedMoney(-expense)}</b>
        </span>
        <span>
          Neto{" "}
          <b className="text-[0.9375rem] text-foreground tabular-nums">
            {signedMoney(income - expense)}
          </b>
        </span>
        <span className="text-xs sm:ml-auto">Las transferencias no suman al neto</span>
      </div>

      <Card className="py-0">
        <TransactionRows
          transactions={transactions}
          accountId={accountId || undefined}
          empty={
            <EmptyState
              icon={SearchIcon}
              title="Sin resultados"
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              }
            >
              Ningún movimiento coincide con tu búsqueda o filtros.
            </EmptyState>
          }
        />
      </Card>
    </>
  );
}

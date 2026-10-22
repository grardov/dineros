"use client";

// The signed-in user's data, loaded from core by the (app) layout and shared with every page.
// Writes are server actions (lib/actions.ts) that refresh the router, which reloads this.

import { createContext, useContext, useMemo, useState } from "react";

import type { StoreData } from "@/lib/data";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function useStoreValue(data: StoreData) {
  const [today] = useState(() => iso(new Date()));

  return useMemo(
    () => ({
      accounts: data.accounts,
      categories: data.categories,
      transactions: data.transactions, // newest first
      recurring: data.recurring,
      occurrences: data.occurrences, // this month and next, by due date
      today,
      balance: (id: string) => data.balances[id]?.balance ?? 0,
      statements: (a: { id: string }) => data.statements[a.id] ?? [], // newest corte first
      account: (id: string | null) => data.accounts.find((a) => a.id === id),
      category: (id: string | null) => data.categories.find((c) => c.id === id),
      fijo: (id: string | null) => data.recurring.find((r) => r.id === id),
    }),
    [data, today],
  );
}

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ data, children }: { data: StoreData; children: React.ReactNode }) {
  return <StoreContext value={useStoreValue(data)}>{children}</StoreContext>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore outside <StoreProvider>");
  return store;
}

"use client";

// The signed-in user's data, loaded from core by the (app) layout and shared with every page.
// Writes are server actions (lib/actions.ts) that refresh the router, which reloads this.

import { createContext, useContext, useMemo, useState } from "react";

import type { StoreData } from "@/lib/data";
import { HIDE_AMOUNTS, money, signedMoney } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const MASK = "$••••";

function useStoreValue(data: StoreData) {
  const [today] = useState(() => iso(new Date()));
  const [loadedAt] = useState(() => Date.now());
  // Hide amounts for when someone could see the screen; remembered in a cookie for a year.
  const [hidden, setHidden] = useState(data.hideAmounts);

  return useMemo(
    () => ({
      email: data.email,
      profile: data.profile,
      accounts: data.accounts,
      categories: data.categories,
      transactions: data.transactions, // newest first
      recurring: data.recurring,
      occurrences: data.occurrences, // this month and next, by due date
      // Spending without fijos, the last year only: the total and how many expenses.
      spentOn: (day: string) => data.daily[day]?.amount ?? 0,
      expensesOn: (day: string) => data.daily[day]?.count ?? 0,
      today,
      hidden,
      toggleHidden: () => {
        document.cookie = `${HIDE_AMOUNTS}=${hidden ? 0 : 1}; path=/; max-age=31536000; samesite=lax`;
        setHidden(!hidden);
      },
      money: (amount: number, currency?: string) => (hidden ? MASK : money(amount, currency)),
      signedMoney: (amount: number, currency?: string, plus?: boolean) =>
        hidden ? MASK : signedMoney(amount, currency, plus),
      loadedAt, // ms; what's created after this is new in this visit
      balance: (id: string) => data.balances[id]?.balance ?? 0,
      statements: (a: { id: string }) => data.statements[a.id] ?? [], // newest corte first
      account: (id: string | null) => data.accounts.find((a) => a.id === id),
      category: (id: string | null) => data.categories.find((c) => c.id === id),
      fijo: (id: string | null) => data.recurring.find((r) => r.id === id),
    }),
    [data, today, loadedAt, hidden],
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

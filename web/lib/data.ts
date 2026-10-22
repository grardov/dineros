import "server-only";

import { connection } from "next/server";

import { api } from "@/lib/api";
import type { Account, Category, CreditCardStatement, Transaction } from "@/lib/types";

// core sends Decimal as a string; these are the money fields to turn into numbers.
type Wire<T, K extends keyof T> = Omit<T, K> & Record<K, string | null>;

const toNumbers = <T, K extends keyof T>(row: Wire<T, K>, keys: K[]) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, keys.includes(k as K) && v !== null ? Number(v) : v]),
  ) as T;

type Balance = { account_id: string; balance: number; available_credit: number | null };

// Everything the (app) pages read, fetched once per request as the signed-in user.
// ponytail: the newest 500 transactions; page through /transactions/ when someone has more.
export async function loadData() {
  // supabase-js reads Date.now() while building the client; keep it out of the prerender.
  await connection();
  const [accounts, categories, transactions, balances] = await Promise.all([
    api<Wire<Account, "opening_balance" | "credit_limit">[]>("/accounts/?include_archived=true"),
    api<Category[]>("/categories/"),
    api<Wire<Transaction, "amount">[]>("/transactions/?limit=500"),
    api<Wire<Balance, "balance" | "available_credit">[]>("/accounts/balances/"),
  ]);
  const credit = accounts.filter((a) => a.type === "credit");
  const statements = await Promise.all(
    credit.map((a) =>
      api<Wire<CreditCardStatement, "charges" | "statement_balance" | "payments" | "pending">[]>(
        `/accounts/${a.id}/statements/`,
      ),
    ),
  );

  return {
    accounts: accounts.map((a) => toNumbers(a, ["opening_balance", "credit_limit"])),
    categories,
    transactions: transactions.map((t) => toNumbers(t, ["amount"])),
    balances: Object.fromEntries(
      balances.map((b) => [b.account_id, toNumbers(b, ["balance", "available_credit"])]),
    ),
    statements: Object.fromEntries(
      credit.map((a, i) => [
        a.id,
        statements[i].map((s) =>
          toNumbers(s, ["charges", "statement_balance", "payments", "pending"]),
        ),
      ]),
    ),
  };
}

export type StoreData = Awaited<ReturnType<typeof loadData>>;

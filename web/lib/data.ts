import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import {
  type Account,
  type Category,
  type CreditCardStatement,
  type Profile,
  type Recurring,
  type RecurringOccurrence,
  type Transaction,
  HIDE_AMOUNTS,
} from "@/lib/types";

// core sends Decimal as a string; these are the money fields to turn into numbers.
type Wire<T, K extends keyof T> = Omit<T, K> & Record<K, string | null>;

const toNumbers = <T, K extends keyof T>(row: Wire<T, K>, keys: K[]) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, keys.includes(k as K) && v !== null ? Number(v) : v]),
  ) as T;

// Shared by the layout's data and its user menu within a request.
export const getProfile = cache(() => api<Profile>("/profile/"));

type Balance = { account_id: string; balance: number; available_credit: number | null };

// Everything the (app) pages read, fetched once per request as the signed-in user.
// ponytail: the newest 500 transactions; page through /transactions/ when someone has more.
export async function loadData() {
  // supabase-js reads Date.now() while building the client; keep it out of the prerender.
  await connection();
  const profile = await getProfile();
  if (!profile.onboarded_at) redirect("/onboarding");
  const [claims, accounts, categories, transactions, balances, recurring, occurrences] =
    await Promise.all([
      createClient().then((s) => s.auth.getClaims()),
      api<Wire<Account, "opening_balance" | "last_statement_pending" | "credit_limit">[]>(
        "/accounts/?include_archived=true",
      ),
      api<Category[]>("/categories/"),
      api<Wire<Transaction, "amount">[]>("/transactions/?limit=500"),
      api<Wire<Balance, "balance" | "available_credit">[]>("/accounts/balances/"),
      api<Wire<Recurring, "amount">[]>("/recurring/"),
      api<Wire<RecurringOccurrence, "expected_amount" | "paid_amount" | "fijo_charges">[]>(
        "/recurring/occurrences/",
      ),
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
    hideAmounts: (await cookies()).get(HIDE_AMOUNTS)?.value === "1",
    email: claims.data?.claims.email ?? "",
    profile,
    accounts: accounts.map((a) =>
      toNumbers(a, ["opening_balance", "last_statement_pending", "credit_limit"]),
    ),
    categories,
    transactions: transactions.map((t) => toNumbers(t, ["amount"])),
    recurring: recurring.map((r) => toNumbers(r, ["amount"])),
    occurrences: occurrences.map((o) =>
      toNumbers(o, ["expected_amount", "paid_amount", "fijo_charges"]),
    ), // by due date
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

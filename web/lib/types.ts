// Mirrors of core/app/models.py. Money is a number here; core sends Decimal as a string, which
// lib/data.ts parses.

export type AccountType = "debit" | "credit" | "cash" | "savings" | "investment";
export type CategoryKind = "expense" | "income";
export type TransactionKind = "expense" | "income" | "transfer";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  opening_balance: number;
  credit_limit: number | null;
  statement_day: number | null;
  payment_due_day: number | null;
  archived_at: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string | null; // an emoji
  kind: CategoryKind;
  parent_id: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  kind: TransactionKind;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  description: string | null;
  notes: string | null;
  tags: string[];
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type CreditCardStatement = {
  account_id: string;
  period_start: string;
  statement_date: string;
  due_date: string;
  is_closed: boolean;
  charges: number;
  statement_balance: number;
  payments: number;
  pending: number;
};

export const ACCOUNT_TYPES: Record<AccountType, string> = {
  debit: "Débito",
  credit: "Crédito",
  cash: "Efectivo",
  savings: "Ahorro",
  investment: "Inversión",
};

export const TRANSACTION_KINDS: Record<TransactionKind, string> = {
  expense: "Gasto",
  income: "Ingreso",
  transfer: "Transferencia",
};

export const CATEGORY_KINDS: Record<CategoryKind, string> = {
  expense: "Gasto",
  income: "Ingreso",
};

export function money(amount: number, currency = "MXN") {
  // `|| 0` turns -0 into 0, so sums of nothing don't print "-$0.00".
  return (amount || 0).toLocaleString("es-MX", { style: "currency", currency });
}

export const MINUS = "\u2212";

// Typographic minus for negatives; "+" only where asked (income in lists).
export function signedMoney(amount: number, currency = "MXN", plus = true) {
  const sign = amount < 0 ? MINUS : plus && amount > 0 ? "+" : "";
  return sign + money(Math.abs(amount), currency);
}

export function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

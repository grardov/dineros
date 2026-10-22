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
  last_statement_pending: number | null; // credit cards added mid-period
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
  recurring_id: string | null; // registered from this fijo…
  recurring_period: string | null; // …for this month (its first day)
  created_at: string;
};

// A "fijo". amount is null only for a credit card payment, which takes the statement due.
export type Recurring = {
  id: string;
  name: string;
  kind: TransactionKind;
  amount: number | null;
  is_variable: boolean;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  day_of_month: number;
  every_months: number;
  starts_on: string;
  ends_on: string | null;
  paused_at: string | null;
  created_at: string;
};

// What a fijo expects in a month (this one or the next), from recurring_occurrences.
export type RecurringOccurrence = {
  recurring_id: string;
  month: string; // YYYY-MM-01
  due_on: string;
  expected_amount: number;
  is_estimate: boolean;
  paid_amount: number;
  status: "paid" | "overdue" | "pending";
};

export const FREQUENCIES: Record<number, string> = {
  1: "Mensual",
  2: "Bimestral",
  3: "Trimestral",
  4: "Cuatrimestral",
  6: "Semestral",
  12: "Anual",
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

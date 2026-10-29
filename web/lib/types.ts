// Mirrors of core/app/models.py. Money is a number here; core sends Decimal as a string, which
// lib/data.ts parses.

export type AccountType = "debit" | "credit" | "cash" | "savings" | "investment";
export type CategoryKind = "expense" | "income";
export type CategoryBucket = "need" | "want";
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
  // To receive transfers (digits only); never on cash accounts.
  clabe: string | null;
  account_number: string | null;
  card_number: string | null;
  archived_at: string | null;
  created_at: string;
};

export type Profile = {
  display_name: string | null;
  currency: string; // for new accounts
  // Datos fiscales for a factura.
  rfc: string | null;
  legal_name: string | null; // as in the Constancia de Situación Fiscal
  tax_zip: string | null;
  tax_regime: string | null; // TAX_REGIMES key
  cfdi_use: string | null; // CFDI_USES key
  // Salud financiera: the rule as % of income (adding up to 100) and the emergency fund goal.
  needs_pct: number;
  wants_pct: number;
  savings_pct: number;
  emergency_months: number;
  health_started_at: string | null; // null until they set up their rule
  onboarded_at: string | null; // null until onboarding is done
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string | null; // an emoji
  kind: CategoryKind;
  parent_id: string | null;
  // Expenses only: null on a subcategory follows its parent; on a top-level one, not classified.
  bucket: CategoryBucket | null;
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
  fijo_charges: number; // card payment: unpaid fijos charged to the card before its corte
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

// SAT catalogs, personas físicas only: c_RegimenFiscal and c_UsoCFDI.
export const TAX_REGIMES: Record<string, string> = {
  "605": "Sueldos y salarios",
  "606": "Arrendamiento",
  "607": "Enajenación o adquisición de bienes",
  "608": "Demás ingresos",
  "610": "Residentes en el extranjero",
  "611": "Ingresos por dividendos",
  "612": "Actividades empresariales y profesionales",
  "614": "Ingresos por intereses",
  "615": "Obtención de premios",
  "616": "Sin obligaciones fiscales",
  "621": "Incorporación fiscal",
  "625": "Plataformas tecnológicas",
  "626": "Régimen Simplificado de Confianza",
};

export const CFDI_USES: Record<string, string> = {
  G01: "Adquisición de mercancías",
  G03: "Gastos en general",
  D01: "Honorarios médicos, dentales y hospitalarios",
  D02: "Gastos médicos por incapacidad o discapacidad",
  D03: "Gastos funerales",
  D04: "Donativos",
  D05: "Intereses reales de créditos hipotecarios",
  D07: "Primas de seguros de gastos médicos",
  D08: "Transporte escolar obligatorio",
  D10: "Servicios educativos (colegiaturas)",
  S01: "Sin efectos fiscales",
};

export const TRANSACTION_KINDS: Record<TransactionKind, string> = {
  expense: "Gasto",
  income: "Ingreso",
  transfer: "Transferencia",
};

export const CATEGORY_BUCKETS: Record<CategoryBucket, string> = {
  need: "Necesidad",
  want: "Deseo",
};

// Income, or spending in a bucket (null: not classified), in a month; from /transactions/monthly/.
export type MonthlyTotal = {
  month: string; // YYYY-MM-01
  kind: "income" | "expense";
  bucket: CategoryBucket | null;
  amount: number;
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

// Cookie that keeps amounts hidden across visits, so the server renders them hidden too.
export const HIDE_AMOUNTS = "hide_amounts";

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

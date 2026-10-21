"use client";

// ponytail: in-memory mock of core so the UI can be built before wiring it; state resets on
// reload. Replace each action with a server action that calls api(), and balances/statements
// with GET /accounts/balances/ and /accounts/{id}/statements/.

import { createContext, useContext, useMemo, useState } from "react";

import type { Account, Category, CreditCardStatement, Transaction } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: string, days: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + days);
  return iso(d);
};
// `day` of month `m` (0-based, may overflow), clamped to its last day: corte 31 → 28/29/30.
const dayInMonth = (y: number, m: number, day: number) =>
  iso(new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate())));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

type Data = { accounts: Account[]; categories: Category[]; transactions: Transaction[] };

function seed(today: string): Data {
  const at = `${addDays(today, -120)}T12:00:00Z`;
  const account = (a: Partial<Account> & Pick<Account, "id" | "name" | "type">): Account => ({
    institution: null,
    currency: "MXN",
    opening_balance: 0,
    credit_limit: null,
    statement_day: null,
    payment_due_day: null,
    archived_at: null,
    created_at: at,
    ...a,
  });
  const accounts = [
    account({
      id: "nomina",
      name: "Nómina",
      type: "debit",
      institution: "BBVA",
      opening_balance: 18400,
    }),
    account({
      id: "oro",
      name: "Oro",
      type: "credit",
      institution: "Banamex",
      credit_limit: 45000,
      statement_day: 15,
      payment_due_day: 5,
    }),
    account({
      id: "nu",
      name: "Nu",
      type: "credit",
      institution: "Nu",
      credit_limit: 20000,
      statement_day: 3,
      payment_due_day: 23,
    }),
    account({ id: "cartera", name: "Cartera", type: "cash", opening_balance: 1200 }),
    account({
      id: "cajita",
      name: "Cajita",
      type: "savings",
      institution: "Nu",
      opening_balance: 25000,
    }),
    account({
      id: "cetes",
      name: "Cetes",
      type: "investment",
      institution: "Cetesdirecto",
      opening_balance: 40000,
    }),
  ];

  const defaults = {
    expense: [
      ["Súper y despensa", "🛒"],
      ["Restaurantes", "🍽️"],
      ["Transporte", "🚌"],
      ["Gasolina", "⛽"],
      ["Vivienda", "🏠"],
      ["Servicios", "💡"],
      ["Salud", "🏥"],
      ["Educación", "🎓"],
      ["Entretenimiento", "🎬"],
      ["Suscripciones", "🔁"],
      ["Ropa", "👕"],
      ["Viajes", "✈️"],
      ["Regalos", "🎁"],
      ["Mascotas", "🐶"],
      ["Comisiones e intereses", "🧾"],
      ["Otros gastos", "📦"],
    ],
    income: [
      ["Nómina", "💼"],
      ["Transferencia recibida", "📥"],
      ["Honorarios", "🧑‍💻"],
      ["Rendimientos", "📈"],
      ["Reembolsos", "↩️"],
      ["Otros ingresos", "💰"],
    ],
  } as const;
  const categories: Category[] = Object.entries(defaults).flatMap(([kind, list]) =>
    list.map(([name, icon], i) => ({
      id: `${kind}-${i}`,
      name,
      icon,
      kind: kind as Category["kind"],
      parent_id: null,
      created_at: at,
    })),
  );
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;
  categories.push(
    {
      id: "uber",
      name: "Uber y Didi",
      icon: "🚕",
      kind: "expense",
      parent_id: cat("Transporte"),
      created_at: at,
    },
    {
      id: "streaming",
      name: "Streaming",
      icon: "📺",
      kind: "expense",
      parent_id: cat("Suscripciones"),
      created_at: at,
    },
  );

  let n = 0;
  const tx = (
    daysAgo: number,
    kind: Transaction["kind"],
    amount: number,
    account_id: string,
    rest: Partial<Transaction> = {},
  ): Transaction => ({
    id: `tx-${n++}`,
    kind,
    amount,
    occurred_on: addDays(today, -daysAgo),
    account_id,
    to_account_id: null,
    category_id: null,
    description: null,
    notes: null,
    tags: [],
    location_name: null,
    latitude: null,
    longitude: null,
    created_at: at,
    ...rest,
  });
  const transactions = [
    tx(1, "expense", 842.5, "oro", {
      category_id: cat("Súper y despensa"),
      description: "Walmart",
      location_name: "Walmart Universidad",
    }),
    tx(2, "expense", 129, "nu", {
      category_id: "streaming",
      description: "Netflix",
      tags: ["recurrente"],
    }),
    tx(3, "expense", 96, "nomina", { category_id: "uber", description: "Uber al trabajo" }),
    tx(4, "expense", 650, "oro", {
      category_id: cat("Restaurantes"),
      description: "Cena",
      tags: ["pareja"],
    }),
    tx(6, "transfer", 3000, "nomina", { to_account_id: "cajita", description: "Ahorro quincena" }),
    tx(6, "income", 21500, "nomina", { category_id: cat("Nómina"), description: "Quincena" }),
    tx(8, "expense", 1100, "oro", { category_id: cat("Gasolina"), description: "Gasolina" }),
    tx(10, "expense", 380, "cartera", { category_id: cat("Restaurantes"), description: "Tacos" }),
    tx(12, "transfer", 4800, "nomina", { to_account_id: "oro", description: "Pago tarjeta Oro" }),
    tx(14, "expense", 2350, "nu", { category_id: cat("Ropa"), description: "Liverpool" }),
    tx(16, "expense", 9500, "nomina", {
      category_id: cat("Vivienda"),
      description: "Renta",
      tags: ["recurrente"],
    }),
    tx(18, "expense", 1450, "oro", { category_id: cat("Súper y despensa"), description: "Costco" }),
    tx(20, "expense", 549, "nomina", {
      category_id: cat("Servicios"),
      description: "Internet",
      tags: ["recurrente"],
    }),
    tx(21, "income", 21500, "nomina", { category_id: cat("Nómina"), description: "Quincena" }),
    tx(22, "transfer", 5000, "nomina", {
      to_account_id: "cetes",
      description: "Inversión mensual",
    }),
    tx(25, "expense", 780, "nu", {
      category_id: cat("Entretenimiento"),
      description: "Cine y cena",
    }),
    tx(28, "expense", 1200, "oro", {
      category_id: cat("Salud"),
      description: "Consulta",
      notes: "Reembolsable por el seguro",
    }),
    tx(32, "income", 1200, "nomina", {
      category_id: cat("Reembolsos"),
      description: "Reembolso seguro",
    }),
    tx(35, "expense", 3400, "oro", {
      category_id: cat("Viajes"),
      description: "Vuelo GDL",
      tags: ["vacaciones"],
    }),
    tx(36, "income", 21500, "nomina", { category_id: cat("Nómina"), description: "Quincena" }),
    tx(40, "transfer", 2000, "nomina", { to_account_id: "nu", description: "Pago Nu" }),
    tx(45, "expense", 690, "oro", { category_id: cat("Mascotas"), description: "Croquetas" }),
    tx(50, "income", 312.4, "cetes", {
      category_id: cat("Rendimientos"),
      description: "Rendimiento Cetes",
    }),
    tx(52, "income", 21500, "nomina", { category_id: cat("Nómina"), description: "Quincena" }),
  ];
  return { accounts, categories, transactions };
}

type Movement = { date: string; amount: number };

function movementsOf(transactions: Transaction[], accountId: string): Movement[] {
  return transactions.flatMap((t) => {
    const out: Movement[] = [];
    if (t.account_id === accountId)
      out.push({ date: t.occurred_on, amount: t.kind === "income" ? t.amount : -t.amount });
    if (t.to_account_id === accountId) out.push({ date: t.occurred_on, amount: t.amount });
    return out;
  });
}

// Same math as the credit_card_statements view, newest corte first.
function statementsOf(a: Account, moves: Movement[], today: string): CreditCardStatement[] {
  const sd = a.statement_day!;
  const pd = a.payment_due_day!;
  const first = parse([a.created_at.slice(0, 10), ...moves.map((m) => m.date)].sort()[0]);
  const now = parse(today);
  const out: CreditCardStatement[] = [];
  for (
    let i = first.getFullYear() * 12 + first.getMonth();
    i <= now.getFullYear() * 12 + now.getMonth() + 1;
    i++
  ) {
    const [y, m] = [Math.floor(i / 12), i % 12];
    const period_start = addDays(dayInMonth(y, m - 1, sd), 1);
    if (period_start > today) continue;
    const statement_date = dayInMonth(y, m, sd);
    const due_date = pd > sd ? dayInMonth(y, m, pd) : dayInMonth(y, m + 1, pd);
    const between = (lo: string, hi: string, pred: (x: number) => boolean) =>
      sum(moves.filter((x) => x.date >= lo && x.date <= hi && pred(x.amount)).map((x) => x.amount));
    const statement_balance = -(
      a.opening_balance + sum(moves.filter((x) => x.date <= statement_date).map((x) => x.amount))
    );
    const payments = between(addDays(statement_date, 1), due_date, (x) => x > 0);
    out.push({
      account_id: a.id,
      period_start,
      statement_date,
      due_date,
      is_closed: statement_date < today,
      charges: -between(period_start, statement_date, (x) => x < 0),
      statement_balance,
      payments,
      pending: Math.max(statement_balance - payments, 0),
    });
  }
  return out.reverse();
}

function useStoreValue() {
  const [today] = useState(() => iso(new Date()));
  const [data, setData] = useState(() => seed(today));

  return useMemo(() => {
    const upsert = <T extends { id: string }>(rows: T[], row: T) =>
      rows.some((r) => r.id === row.id)
        ? rows.map((r) => (r.id === row.id ? row : r))
        : [row, ...rows];

    const balance = (id: string) => {
      const a = data.accounts.find((x) => x.id === id)!;
      return a.opening_balance + sum(movementsOf(data.transactions, id).map((m) => m.amount));
    };

    return {
      ...data,
      // Newest first, like GET /transactions/.
      transactions: data.transactions.toSorted(
        (a, b) =>
          b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at),
      ),
      today,
      newId: () => crypto.randomUUID(),
      balance,
      availableCredit: (a: Account) =>
        a.credit_limit === null ? null : a.credit_limit + balance(a.id),
      statements: (a: Account) => statementsOf(a, movementsOf(data.transactions, a.id), today),
      account: (id: string | null) => data.accounts.find((a) => a.id === id),
      category: (id: string | null) => data.categories.find((c) => c.id === id),

      saveAccount: (a: Account) => setData((d) => ({ ...d, accounts: upsert(d.accounts, a) })),
      // Like the DB: an account with transactions can't be deleted (no cascade), only archived.
      deleteAccount: (id: string) => {
        if (data.transactions.some((t) => t.account_id === id || t.to_account_id === id))
          return "La cuenta tiene movimientos. Archívala en su lugar.";
        setData((d) => ({ ...d, accounts: d.accounts.filter((a) => a.id !== id) }));
        return null;
      },

      saveCategory: (c: Category) =>
        setData((d) => ({ ...d, categories: upsert(d.categories, c) })),
      // Like the DB's `on delete set null`: subcategories move up, transactions lose the category.
      deleteCategory: (id: string) =>
        setData((d) => ({
          accounts: d.accounts,
          categories: d.categories
            .filter((c) => c.id !== id)
            .map((c) => (c.parent_id === id ? { ...c, parent_id: null } : c)),
          transactions: d.transactions.map((t) =>
            t.category_id === id ? { ...t, category_id: null } : t,
          ),
        })),

      saveTransaction: (t: Transaction) =>
        setData((d) => ({ ...d, transactions: upsert(d.transactions, t) })),
      deleteTransaction: (id: string) =>
        setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) })),
    };
  }, [data, today]);
}

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <StoreContext value={useStoreValue()}>{children}</StoreContext>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore outside <StoreProvider>");
  return store;
}

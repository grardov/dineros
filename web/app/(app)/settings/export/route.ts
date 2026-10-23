import { api } from "@/lib/api";
import type { Account, Category, Transaction } from "@/lib/types";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

// Every transaction as a CSV, with account and category names instead of ids.
export async function GET() {
  const [accounts, categories, transactions] = await Promise.all([
    api<Account[]>("/accounts/?include_archived=true"),
    api<Category[]>("/categories/"),
    api<Transaction[]>("/transactions/?limit=100000"),
  ]);
  const name = (list: { id: string; name: string }[], id: string | null) =>
    list.find((x) => x.id === id)?.name;
  const rows = [
    [
      "fecha",
      "tipo",
      "monto",
      "cuenta",
      "cuenta_destino",
      "categoria",
      "descripcion",
      "notas",
      "etiquetas",
    ],
    ...transactions.map((t) => [
      t.occurred_on,
      t.kind,
      t.amount,
      name(accounts, t.account_id),
      name(accounts, t.to_account_id),
      name(categories, t.category_id),
      t.description,
      t.notes,
      t.tags.join(" "),
    ]),
  ];
  return new Response("﻿" + rows.map((r) => r.map(cell).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dineros-movimientos.csv"',
    },
  });
}

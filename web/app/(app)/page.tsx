"use client";

import { TransactionList } from "@/components/transaction-list";
import { useStore } from "@/lib/store";

export default function Home() {
  const store = useStore();
  const month = store.today.slice(0, 7);
  const title = new Date(`${store.today}T00:00:00`).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  return (
    <TransactionList
      title={title[0].toUpperCase() + title.slice(1)}
      description="Gastos, ingresos y transferencias del mes"
      transactions={store.transactions.filter((t) => t.occurred_on.startsWith(month))}
    />
  );
}

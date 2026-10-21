"use client";

import { TransactionList } from "@/components/transaction-list";
import { useStore } from "@/lib/store";

export default function TransactionsPage() {
  const store = useStore();
  return (
    <TransactionList
      title="Movimientos"
      description="Todos tus movimientos"
      transactions={store.transactions}
    />
  );
}

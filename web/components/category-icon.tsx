"use client";

import { ArrowLeftRightIcon } from "lucide-react";

import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";

const box = "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg";

// A subcategory without its own icon borrows its parent's; then the first letter of the name.
export function CategoryIcon({ categoryId }: { categoryId: string | null }) {
  const store = useStore();
  const c = store.category(categoryId);
  const icon = c?.icon ?? store.category(c?.parent_id ?? null)?.icon;
  return (
    <span className={box} aria-hidden>
      {icon ?? (
        <span className="text-sm font-medium text-muted-foreground">{c?.name[0] ?? "·"}</span>
      )}
    </span>
  );
}

export function TransactionIcon({ transaction }: { transaction: Transaction }) {
  if (transaction.kind === "transfer")
    return (
      <span className={box} aria-hidden>
        <ArrowLeftRightIcon className="size-4 text-muted-foreground" />
      </span>
    );
  return <CategoryIcon categoryId={transaction.category_id} />;
}

"use client";

import { ArrowLeftRightIcon } from "lucide-react";

import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { cn } from "cn";

// Eight hues at the same lightness and chroma, so no category outweighs another.
const HUES = [140, 25, 230, 60, 95, 330, 280, 175];

export type Tone = { bg: string; fg: string; chart: string };

const TRANSFER: Tone = {
  bg: "var(--transfer-soft)",
  fg: "var(--transfer)",
  chart: "#a9b2bd",
};

// Subcategories share their parent's hue; the hue is derived from the parent's id so it
// stays put when categories are added or renamed.
export function useCategory(categoryId: string | null) {
  const store = useStore();
  const category = store.category(categoryId);
  const parent = store.category(category?.parent_id ?? null);
  const root = parent ?? category;
  let tone = TRANSFER;
  if (root) {
    const h = HUES[[...root.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % 8];
    tone = {
      bg: `oklch(0.95 0.035 ${h})`,
      fg: `oklch(0.42 0.09 ${h})`,
      chart: `oklch(0.64 0.1 ${h})`,
    };
  }
  return { category, parent, tone, icon: category?.icon ?? parent?.icon ?? null };
}

const tile = "flex size-9 shrink-0 items-center justify-center rounded-[10px] text-lg";

// Without an emoji (here or on the parent) it shows the first letter of the name.
export function CategoryIcon({
  categoryId,
  className,
}: {
  categoryId: string | null;
  className?: string;
}) {
  const { category, tone, icon } = useCategory(categoryId);
  return (
    <span className={cn(tile, className)} style={{ background: tone.bg }} aria-hidden>
      {icon ?? (
        <span className="text-sm font-semibold" style={{ color: tone.fg }}>
          {category?.name[0] ?? "·"}
        </span>
      )}
    </span>
  );
}

export function TransactionIcon({
  transaction,
  className,
}: {
  transaction: Pick<Transaction, "kind" | "category_id">;
  className?: string;
}) {
  if (transaction.kind === "transfer")
    return (
      <span className={cn(tile, "bg-transfer-soft text-transfer", className)} aria-hidden>
        <ArrowLeftRightIcon className="size-4" />
      </span>
    );
  return <CategoryIcon categoryId={transaction.category_id} className={className} />;
}

export function CategoryChip({ categoryId }: { categoryId: string | null }) {
  const { category, parent, tone, icon } = useCategory(categoryId);
  return (
    <span
      className="inline-flex h-6 max-w-full items-center gap-1.5 truncate rounded-full pr-2.5 pl-2 text-[0.78rem] font-medium"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {parent && (
        <>
          {parent.name}
          <span className="opacity-50">›</span>
        </>
      )}
      {category?.name ?? "Sin categoría"}
    </span>
  );
}

"use client";

import { ChevronRightIcon, PlusIcon, TagsIcon } from "lucide-react";
import { useState } from "react";

import { CategoryDialog } from "@/components/category-dialog";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState, PageHeader } from "@/components/finance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { CATEGORY_KINDS, type Category, type CategoryKind, money } from "@/lib/types";

const cols =
  "grid grid-cols-[minmax(0,1fr)_5rem_1rem] items-center gap-3.5 sm:grid-cols-[minmax(0,1fr)_7rem_8rem_1rem]";

export default function CategoriesPage() {
  const store = useStore();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const month = store.today.slice(0, 7);
  const monthName = new Date(`${store.today}T00:00:00`).toLocaleDateString("es-MX", {
    month: "long",
  });

  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);
  const childrenOf = (id: string) =>
    store.categories.filter((c) => c.parent_id === id).sort(byName);
  // A parent's numbers include its subcategories'.
  const stats = (c: Category) => {
    const ids = [c.id, ...(c.parent_id ? [] : childrenOf(c.id).map((x) => x.id))];
    const txs = store.transactions.filter((t) => t.category_id && ids.includes(t.category_id));
    const amount = txs
      .filter((t) => t.occurred_on.startsWith(month))
      .reduce((s, t) => s + t.amount, 0);
    return { count: txs.length, amount };
  };
  const roots = (k: CategoryKind) =>
    store.categories.filter((c) => c.kind === k && c.parent_id === null);

  const row = (c: Category, sub = false) => {
    const { count, amount } = stats(c);
    const kids = sub ? 0 : childrenOf(c.id).length;
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => setEditing(c)}
        className={`${cols} w-full border-b border-muted px-4 text-left transition-colors last:border-b-0 hover:bg-sidebar focus-visible:bg-accent focus-visible:outline-none sm:px-[18px] ${sub ? "h-11" : "h-[54px]"}`}
      >
        <span className={`flex min-w-0 items-center gap-2.5 ${sub ? "pl-3.5" : ""}`}>
          {sub && (
            <span className="-mt-3.5 h-[18px] w-3 shrink-0 rounded-bl-[5px] border-b-[1.5px] border-l-[1.5px] border-input" />
          )}
          <CategoryIcon
            categoryId={c.id}
            className={sub ? "size-6 rounded-md text-sm" : "size-[30px] rounded-lg text-base"}
          />
          <span className={`truncate text-sm ${sub ? "" : "font-semibold"}`}>{c.name}</span>
          {kids > 0 && (
            <span className="shrink-0 text-xs text-subtle max-sm:hidden">
              {kids} subcategoría{kids === 1 ? "" : "s"}
            </span>
          )}
        </span>
        <span className="text-right text-[0.8125rem] text-muted-foreground tabular-nums max-sm:hidden">
          {count}
        </span>
        <span className={`text-right text-sm tabular-nums ${sub ? "" : "font-semibold"}`}>
          {amount ? money(amount) : "—"}
        </span>
        <ChevronRightIcon className="size-4 text-[#a2abb6]" />
      </button>
    );
  };

  return (
    <>
      <PageHeader title="Categorías">
        <Button onClick={() => setEditing("new")}>
          <PlusIcon /> Nueva categoría
        </Button>
      </PageHeader>

      <Tabs value={kind} onValueChange={(v) => setKind(v as CategoryKind)}>
        <TabsList>
          {Object.entries(CATEGORY_KINDS).map(([value, label]) => (
            <TabsTrigger key={value} value={value} className="px-3.5 text-[0.8125rem]">
              {label}s <span className="text-subtle">{roots(value as CategoryKind).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!roots(kind).length && (
        <Card>
          <EmptyState
            icon={TagsIcon}
            title={`No tienes categorías de ${CATEGORY_KINDS[kind].toLowerCase()}`}
            action={
              <Button onClick={() => setEditing("new")}>
                <PlusIcon /> Nueva categoría
              </Button>
            }
          >
            Las categorías agrupan tus movimientos para ver en qué se va tu dinero.
          </EmptyState>
        </Card>
      )}

      {roots(kind).length > 0 && (
        <Card className="gap-0 py-0">
          <div
            className={`${cols} border-b bg-sidebar px-4 py-2.5 text-xs font-medium text-muted-foreground sm:px-[18px]`}
          >
            <span>Nombre</span>
            <span className="text-right max-sm:hidden">Movimientos</span>
            <span className="text-right capitalize">{monthName}</span>
            <span />
          </div>
          {roots(kind)
            .sort(byName)
            .map((p) => [row(p), ...childrenOf(p.id).map((c) => row(c, true))])}
        </Card>
      )}

      {editing && (
        <CategoryDialog
          category={editing === "new" ? undefined : editing}
          kind={kind}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

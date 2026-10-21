"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { CategoryDialog } from "@/components/category-dialog";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { CATEGORY_KINDS, type Category, type CategoryKind } from "@/lib/types";

export default function CategoriesPage() {
  const store = useStore();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  const count = (id: string) => store.transactions.filter((t) => t.category_id === id).length;
  const row = (c: Category, sub = false) => (
    <button
      key={c.id}
      type="button"
      onClick={() => setEditing(c)}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
        sub ? "pl-10 text-muted-foreground" : "font-medium"
      }`}
    >
      <span className="flex items-center gap-3">
        <CategoryIcon categoryId={c.id} />
        {c.name}
      </span>
      <span className="text-xs font-normal text-muted-foreground tabular-nums">
        {count(c.id) || ""}
      </span>
    </button>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <Button onClick={() => setEditing("new")}>
          <PlusIcon /> Categoría
        </Button>
      </div>

      <Tabs value={kind} onValueChange={(v) => setKind(v as CategoryKind)}>
        <TabsList>
          {Object.entries(CATEGORY_KINDS).map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}s
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="flex flex-col">
          {store.categories
            .filter((c) => c.kind === kind && c.parent_id === null)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => [
              row(p),
              ...store.categories
                .filter((c) => c.parent_id === p.id)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => row(c, true)),
            ])}
        </CardContent>
      </Card>

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

"use client";

import { useState } from "react";

import { FormDialog, text } from "@/components/form-dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useStore } from "@/lib/store";
import { CATEGORY_KINDS, type Category, type CategoryKind } from "@/lib/types";

const EMOJIS =
  "🛒 🍽️ 🍔 ☕ 🍺 🚌 🚕 🚗 ⛽ ✈️ 🏠 💡 💧 📱 🌐 🏥 💊 🏋️ 💇 🎓 📚 🎬 🎮 🎵 📺 🔁 👕 👟 🎁 🐶 🧸 🔧 📦 🧾 💳 🏦 💼 💰 📈 ↩️".split(
    " ",
  );

export function CategoryDialog({
  category,
  kind: initialKind,
  open,
  onClose,
}: {
  category?: Category;
  kind: CategoryKind;
  open: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  const [kind, setKind] = useState(category?.kind ?? initialKind);
  const [icon, setIcon] = useState(category?.icon ?? "");
  // One level of nesting: a category with subcategories stays top-level.
  const hasChildren = store.categories.some((c) => c.parent_id === category?.id);
  const parents = store.categories.filter(
    (c) => c.kind === kind && c.parent_id === null && c.id !== category?.id,
  );

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={category ? "Editar categoría" : "Nueva categoría"}
      onDelete={category && (() => (store.deleteCategory(category.id), null))}
      onSubmit={(d) => {
        const name = text(d, "name")!;
        const parent_id = text(d, "parent_id");
        // Mirrors unique (user_id, parent_id, name).
        if (
          store.categories.some(
            (c) => c.id !== category?.id && c.parent_id === parent_id && c.name === name,
          )
        )
          return "Ya existe una categoría con ese nombre.";
        store.saveCategory({
          id: category?.id ?? store.newId(),
          created_at: category?.created_at ?? new Date().toISOString(),
          name,
          icon: icon.trim() || null,
          kind,
          parent_id,
        });
        return null;
      }}
    >
      <div className="grid grid-cols-[3.5rem_1fr] gap-4">
        <Field>
          <FieldLabel htmlFor="icon">Ícono</FieldLabel>
          {/* Any emoji works: pick one below or paste/type it (⌃⌘Space / Win+.) */}
          <Input
            id="icon"
            value={icon}
            maxLength={16}
            onChange={(e) => setIcon(e.target.value)}
            className="text-center text-lg"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="name">Nombre</FieldLabel>
          <Input id="name" name="name" required maxLength={100} defaultValue={category?.name} />
        </Field>
      </div>
      <div className="grid grid-cols-10 gap-1" role="group" aria-label="Íconos sugeridos">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={icon === e}
            onClick={() => setIcon(icon === e ? "" : e)}
            className="flex aspect-square items-center justify-center rounded-md text-lg hover:bg-muted aria-pressed:bg-primary/10 aria-pressed:ring-1 aria-pressed:ring-primary"
          >
            {e}
          </button>
        ))}
      </div>
      <Field>
        <FieldLabel htmlFor="kind">Tipo</FieldLabel>
        <NativeSelect
          id="kind"
          className="w-full"
          value={kind}
          disabled={!!category}
          onChange={(e) => setKind(e.target.value as CategoryKind)}
        >
          {Object.entries(CATEGORY_KINDS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {category && <FieldDescription>El tipo no cambia una vez creada.</FieldDescription>}
      </Field>
      <Field>
        <FieldLabel htmlFor="parent_id">Dentro de</FieldLabel>
        <NativeSelect
          id="parent_id"
          name="parent_id"
          className="w-full"
          disabled={hasChildren}
          defaultValue={category?.parent_id ?? ""}
        >
          <NativeSelectOption value="">Ninguna (principal)</NativeSelectOption>
          {parents.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </FormDialog>
  );
}

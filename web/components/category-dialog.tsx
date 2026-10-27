"use client";

import { InfoIcon, SmilePlusIcon } from "lucide-react";
import { useState } from "react";

import { useCategory } from "@/components/category-icon";
import { FormDialog, text } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteCategory, saveCategory } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { CATEGORY_KINDS, type Category, type CategoryKind } from "@/lib/types";

export function CategoryDialog({
  category,
  parentId: initialParentId,
  kind: initialKind,
  open,
  onClose,
}: {
  category?: Category;
  parentId?: string; // preselected parent for a new subcategory
  kind: CategoryKind;
  open: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  const [kind, setKind] = useState(category?.kind ?? initialKind);
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [picking, setPicking] = useState(false);
  const [parentId, setParentId] = useState(category?.parent_id ?? initialParentId ?? "");
  // The preview takes the hue the category will have: its parent's, or its own.
  const { tone } = useCategory(parentId || category?.id || null);
  // One level of nesting: a category with subcategories stays top-level.
  const hasChildren = store.categories.some((c) => c.parent_id === category?.id);
  const parents = store.categories.filter(
    (c) => c.kind === kind && c.parent_id === null && c.id !== category?.id,
  );

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={
        category ? "Editar categoría" : initialParentId ? "Nueva subcategoría" : "Nueva categoría"
      }
      saved={category ? "Categoría actualizada" : "Categoría creada"}
      deleted="Categoría eliminada"
      onDelete={category && (() => deleteCategory(category.id))}
      onSubmit={(d) => {
        const name = text(d, "name")!;
        const parent_id = parentId || null;
        // Mirrors unique (user_id, parent_id, name).
        if (
          store.categories.some(
            (c) => c.id !== category?.id && c.parent_id === parent_id && c.name === name,
          )
        )
          return "Ya existe una categoría con ese nombre.";
        return saveCategory(category?.id, {
          name,
          icon: icon || null,
          kind,
          parent_id,
        });
      }}
    >
      <div className="flex items-end gap-3">
        <Popover open={picking} onOpenChange={setPicking}>
          <PopoverTrigger
            type="button"
            title="Cambiar ícono"
            aria-label={icon ? `Ícono ${icon}, cambiar` : "Elegir ícono"}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-[22px] ring-primary/40 transition-shadow outline-none hover:ring-2 focus-visible:ring-3 aria-expanded:ring-2"
            style={{ background: tone.bg }}
          >
            {icon || <SmilePlusIcon className="size-5" style={{ color: tone.fg }} />}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto gap-0 p-0">
            <EmojiPicker
              locale="es"
              columns={9}
              onEmojiSelect={({ emoji }) => (setIcon(emoji), setPicking(false))}
              className="h-80"
            >
              <EmojiPickerSearch placeholder="Buscar emoji" autoFocus />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </EmojiPicker>
            {icon && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="m-1 mt-0 justify-start text-muted-foreground"
                onClick={() => (setIcon(""), setPicking(false))}
              >
                Quitar ícono
              </Button>
            )}
          </PopoverContent>
        </Popover>
        <Field>
          <FieldLabel htmlFor="name">Nombre</FieldLabel>
          <Input id="name" name="name" required maxLength={100} defaultValue={category?.name} />
        </Field>
      </div>

      <Field>
        <FieldLabel>Tipo</FieldLabel>
        <Tabs value={kind} onValueChange={(v) => (setKind(v as CategoryKind), setParentId(""))}>
          <TabsList className="grid w-full grid-cols-2">
            {Object.entries(CATEGORY_KINDS).map(([value, label]) => (
              <TabsTrigger key={value} value={value} disabled={!!category}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {category && <FieldDescription>El tipo no cambia una vez creada.</FieldDescription>}
      </Field>

      <Field>
        <FieldLabel htmlFor="parent_id">Categoría padre</FieldLabel>
        <NativeSelect
          id="parent_id"
          className="w-full"
          disabled={hasChildren}
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <NativeSelectOption value="">Ninguna (principal)</NativeSelectOption>
          {parents.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.icon} {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      {category && (
        <p className="flex gap-2.5 rounded-lg bg-background px-3 py-2.5 text-[0.78rem] leading-snug text-sidebar-foreground">
          <InfoIcon className="mt-px size-4 shrink-0 text-muted-foreground" />
          Si eliminas la categoría, sus movimientos quedan como &quot;Sin categoría&quot; y sus
          subcategorías pasan a ser principales.
        </p>
      )}
    </FormDialog>
  );
}

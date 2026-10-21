"use client";

import { MapPinIcon } from "lucide-react";
import { useState } from "react";

import { FormDialog, num, text } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { TRANSACTION_KINDS, type Transaction, type TransactionKind } from "@/lib/types";

export function TransactionDialog({
  transaction,
  accountId,
  open,
  onClose,
}: {
  transaction?: Transaction;
  accountId?: string; // preselected account for new transactions
  open: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  const [kind, setKind] = useState<TransactionKind>(transaction?.kind ?? "expense");
  const [coords, setCoords] = useState(
    transaction?.latitude != null
      ? { lat: transaction.latitude, lng: transaction.longitude! }
      : null,
  );
  const accounts = store.accounts.filter(
    (a) =>
      !a.archived_at || a.id === transaction?.account_id || a.id === transaction?.to_account_id,
  );
  const parents = store.categories.filter((c) => c.kind === kind && c.parent_id === null);

  const accountSelect = (name: string, defaultValue?: string | null) => (
    <NativeSelect
      id={name}
      name={name}
      className="w-full"
      required
      defaultValue={defaultValue ?? ""}
    >
      <NativeSelectOption value="" disabled>
        Elige una cuenta
      </NativeSelectOption>
      {accounts.map((a) => (
        <NativeSelectOption key={a.id} value={a.id}>
          {a.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={transaction ? "Editar movimiento" : "Nuevo movimiento"}
      onDelete={transaction && (() => (store.deleteTransaction(transaction.id), null))}
      onSubmit={(d) => {
        const account_id = text(d, "account_id")!;
        const to_account_id = kind === "transfer" ? text(d, "to_account_id") : null;
        if (to_account_id === account_id) return "Elige dos cuentas distintas.";
        store.saveTransaction({
          id: transaction?.id ?? store.newId(),
          created_at: transaction?.created_at ?? new Date().toISOString(),
          kind,
          amount: num(d, "amount")!,
          occurred_on: text(d, "occurred_on")!,
          account_id,
          to_account_id,
          category_id: kind === "transfer" ? null : text(d, "category_id"),
          description: text(d, "description"),
          notes: text(d, "notes"),
          tags: [
            ...new Set(
              String(d.get("tags"))
                .split(",")
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean),
            ),
          ],
          location_name: text(d, "location_name"),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        });
        return null;
      }}
    >
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {Object.entries(TRANSACTION_KINDS).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={kind === value ? "outline" : "ghost"}
            onClick={() => setKind(value as TransactionKind)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="amount">Monto</FieldLabel>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            autoFocus
            defaultValue={transaction?.amount}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="occurred_on">Fecha</FieldLabel>
          <Input
            id="occurred_on"
            name="occurred_on"
            type="date"
            required
            defaultValue={transaction?.occurred_on ?? store.today}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="description">Descripción</FieldLabel>
        <Input
          id="description"
          name="description"
          maxLength={200}
          defaultValue={transaction?.description ?? ""}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="account_id">{kind === "transfer" ? "Desde" : "Cuenta"}</FieldLabel>
          {accountSelect("account_id", transaction?.account_id ?? accountId)}
        </Field>
        {kind === "transfer" ? (
          <>
            <Field>
              <FieldLabel htmlFor="to_account_id">Hacia</FieldLabel>
              {accountSelect("to_account_id", transaction?.to_account_id)}
            </Field>
            <FieldDescription className="col-span-2">
              Pago de tarjeta, ahorro o inversión entre tus cuentas.
            </FieldDescription>
          </>
        ) : (
          <Field>
            <FieldLabel htmlFor="category_id">Categoría</FieldLabel>
            {/* keyed by kind: the options change, so reset the selection */}
            <NativeSelect
              key={kind}
              id="category_id"
              name="category_id"
              className="w-full"
              defaultValue={transaction?.kind === kind ? (transaction.category_id ?? "") : ""}
            >
              <NativeSelectOption value="">Sin categoría</NativeSelectOption>
              {parents.flatMap((p) => [
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </NativeSelectOption>,
                ...store.categories
                  .filter((c) => c.parent_id === p.id)
                  .map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {"   "}↳ {c.icon ?? p.icon} {c.name}
                    </NativeSelectOption>
                  )),
              ])}
            </NativeSelect>
          </Field>
        )}
      </div>
      <Field>
        <FieldLabel htmlFor="tags">Etiquetas</FieldLabel>
        <Input
          id="tags"
          name="tags"
          placeholder="vacaciones, pareja"
          defaultValue={transaction?.tags.join(", ")}
        />
        <FieldDescription>Separadas por coma.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="location_name">Lugar</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="location_name"
            name="location_name"
            maxLength={200}
            defaultValue={transaction?.location_name ?? ""}
          />
          <Button
            type="button"
            variant={coords ? "secondary" : "outline"}
            size="icon"
            title={coords ? "Quitar ubicación" : "Usar mi ubicación"}
            onClick={() =>
              coords
                ? setCoords(null)
                : navigator.geolocation.getCurrentPosition((p) =>
                    setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
                  )
            }
          >
            <MapPinIcon />
          </Button>
        </div>
        {coords && (
          <FieldDescription>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </FieldDescription>
        )}
      </Field>
      <Field>
        <FieldLabel htmlFor="notes">Notas</FieldLabel>
        <Textarea id="notes" name="notes" rows={2} defaultValue={transaction?.notes ?? ""} />
      </Field>
    </FormDialog>
  );
}

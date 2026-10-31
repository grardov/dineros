"use client";

import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  InfoIcon,
  WalletIcon,
} from "lucide-react";
import { useState } from "react";

import { AccountDialog } from "@/components/account-dialog";
import { EmptyState } from "@/components/finance";
import { DateInput, FormDialog, num, text } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PlaceField } from "@/components/place-field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { deleteTransaction, saveTransaction } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { TRANSACTION_KINDS, type Transaction, type TransactionKind } from "@/lib/types";

const KIND_ICONS = {
  expense: ArrowUpRightIcon,
  income: ArrowDownLeftIcon,
  transfer: ArrowLeftRightIcon,
};
const KIND_COLORS = {
  expense: "data-active:text-expense",
  income: "data-active:text-income",
  transfer: "data-active:text-transfer",
};

// Gasto / Ingreso / Transferencia, shared with the fijo dialog.
export function KindTabs({
  kind,
  onChange,
}: {
  kind: TransactionKind;
  onChange: (kind: TransactionKind) => void;
}) {
  return (
    <Tabs value={kind} onValueChange={(v) => onChange(v as TransactionKind)}>
      {/* Tabs sized by their label, icons dropped on phones: "Transferencia" doesn't fit a third. */}
      <TabsList className="w-full">
        {Object.entries(TRANSACTION_KINDS).map(([value, label]) => {
          const Icon = KIND_ICONS[value as TransactionKind];
          return (
            <TabsTrigger
              key={value}
              value={value}
              className={`flex-auto text-[0.8125rem] data-active:font-semibold ${KIND_COLORS[value as TransactionKind]}`}
            >
              <Icon className="max-sm:hidden" /> {label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

// The kind's categories with their subcategories indented under them.
export function CategorySelect({
  kind,
  defaultValue,
}: {
  kind: TransactionKind;
  defaultValue?: string | null;
}) {
  const store = useStore();
  const parents = store.categories.filter((c) => c.kind === kind && c.parent_id === null);
  return (
    // keyed by kind: the options change, so reset the selection
    <NativeSelect
      key={kind}
      id="category_id"
      name="category_id"
      className="w-full"
      defaultValue={defaultValue ?? ""}
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
  );
}

export function TransactionDialog({
  transaction,
  preset,
  kind: initialKind = "expense",
  accountId,
  toAccountId,
  open,
  onClose,
}: {
  transaction?: Transaction;
  // Values for a new transaction, e.g. one registered from a fijo (with its recurring link).
  preset?: Partial<Transaction>;
  kind?: TransactionKind;
  accountId?: string; // preselected accounts for new transactions
  toAccountId?: string;
  open: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  // What the form starts with: the transaction being edited, or a preset for a new one.
  const initial: Partial<Transaction> | undefined = transaction ?? preset;
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? initialKind);
  const [accountChoice, setAccountChoice] = useState(initial?.account_id ?? accountId ?? "");
  const accounts = store.accounts.filter(
    (a) =>
      !a.archived_at || a.id === transaction?.account_id || a.id === transaction?.to_account_id,
  );
  const currency = store.account(accountChoice)?.currency ?? "MXN";
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Every movement belongs to an account, so the first one has to exist before the form.
  if (!accounts.length) {
    if (creatingAccount) return <AccountDialog open onClose={() => setCreatingAccount(false)} />;
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogTitle className="sr-only">Primero agrega una cuenta</DialogTitle>
          <EmptyState
            icon={WalletIcon}
            title="Primero agrega una cuenta"
            action={
              <>
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={() => setCreatingAccount(true)}>Agregar cuenta</Button>
              </>
            }
          >
            Cada movimiento sale de o llega a una de tus cuentas: débito, efectivo, ahorro o tarjeta
            de crédito.
          </EmptyState>
        </DialogContent>
      </Dialog>
    );
  }

  const accountSelect = (name: string, defaultValue?: string | null) => (
    <NativeSelect
      id={name}
      name={name}
      className="w-full"
      required
      defaultValue={defaultValue ?? ""}
      onChange={name === "account_id" ? (e) => setAccountChoice(e.target.value) : undefined}
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
      title={
        transaction
          ? "Editar movimiento"
          : initial?.recurring_id
            ? "Registrar pago"
            : kind === "transfer"
              ? "Nueva transferencia"
              : "Nuevo movimiento"
      }
      submitLabel={kind === "transfer" && !transaction ? "Transferir" : "Guardar"}
      saved={
        transaction
          ? "Movimiento actualizado"
          : initial?.recurring_id
            ? "Pago registrado"
            : kind === "transfer"
              ? "Transferencia registrada"
              : "Movimiento registrado"
      }
      deleted="Movimiento eliminado"
      onDelete={transaction && (() => deleteTransaction(transaction.id))}
      onSubmit={(d) => {
        const account_id = text(d, "account_id")!;
        const to_account_id = kind === "transfer" ? text(d, "to_account_id") : null;
        if (kind === "transfer" && accounts.length < 2)
          return "Necesitas al menos dos cuentas para transferir.";
        if (to_account_id === account_id) return "Elige dos cuentas distintas.";
        return saveTransaction(transaction?.id, {
          recurring_id: initial?.recurring_id ?? null,
          recurring_period: initial?.recurring_period ?? null,
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
          latitude: num(d, "latitude"),
          longitude: num(d, "longitude"),
        });
      }}
    >
      <KindTabs kind={kind} onChange={setKind} />

      <label className="flex flex-col items-center gap-1 py-1">
        <span className="sr-only">Monto</span>
        <span className="flex max-w-full items-baseline justify-center gap-1 tabular-nums">
          <span className="text-[26px] font-medium text-subtle">$</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            autoFocus
            placeholder="0.00"
            defaultValue={initial?.amount}
            className={`field-sizing-content max-w-full min-w-[4ch] [appearance:textfield] bg-transparent text-[46px] leading-none font-semibold tracking-tight outline-none placeholder:text-input [&::-webkit-inner-spin-button]:appearance-none ${
              kind === "transfer" ? "text-transfer" : ""
            }`}
          />
        </span>
        <span className="text-xs text-subtle">{currency}</span>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="account_id">{kind === "transfer" ? "Desde" : "Cuenta"}</FieldLabel>
          {accountSelect("account_id", initial?.account_id ?? accountId)}
        </Field>
        {kind === "transfer" ? (
          <Field>
            <FieldLabel htmlFor="to_account_id">Hacia</FieldLabel>
            {accountSelect("to_account_id", initial?.to_account_id ?? toAccountId)}
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor="category_id">Categoría</FieldLabel>
            <CategorySelect
              kind={kind}
              defaultValue={initial?.kind === kind ? initial.category_id : null}
            />
          </Field>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="occurred_on">Fecha</FieldLabel>
          <DateInput
            id="occurred_on"
            name="occurred_on"
            required
            defaultValue={initial?.occurred_on ?? store.today}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Descripción</FieldLabel>
          <Input
            id="description"
            name="description"
            maxLength={200}
            defaultValue={initial?.description ?? ""}
          />
        </Field>
      </div>
      {kind === "transfer" && (
        <p className="flex gap-2.5 rounded-lg bg-background px-3 py-2.5 text-[0.78rem] leading-snug text-sidebar-foreground">
          <InfoIcon className="mt-px size-4 shrink-0 text-muted-foreground" />
          {accounts.length < 2
            ? "Necesitas al menos dos cuentas para transferir. Agrega otra en Cuentas."
            : "Las transferencias mueven dinero entre tus cuentas. No cuentan como gasto ni como ingreso."}
        </p>
      )}
      <Field>
        <FieldLabel htmlFor="tags">Etiquetas</FieldLabel>
        <Input
          id="tags"
          name="tags"
          placeholder="vacaciones, pareja"
          defaultValue={initial?.tags?.join(", ")}
        />
        <FieldDescription>Separadas por coma.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="location_name">Ubicación</FieldLabel>
        <PlaceField
          name={initial?.location_name}
          coords={
            initial?.latitude != null ? { lat: initial.latitude, lng: initial.longitude! } : null
          }
          locateOnOpen={!initial}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="notes">Notas</FieldLabel>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Opcional"
          defaultValue={initial?.notes ?? ""}
        />
      </Field>
    </FormDialog>
  );
}

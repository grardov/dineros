"use client";

import { useState } from "react";

import { FormDialog, num, text } from "@/components/form-dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { deleteAccount, saveAccount } from "@/lib/actions";
import { ACCOUNT_TYPES, type Account, type AccountType } from "@/lib/types";

export function AccountDialog({
  account,
  open,
  onClose,
}: {
  account?: Account;
  open: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<AccountType>(account?.type ?? "debit");
  const credit = type === "credit";

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={account ? "Editar cuenta" : "Nueva cuenta"}
      onDelete={account && (() => deleteAccount(account.id))}
      onSubmit={(d) => {
        const opening = num(d, "opening_balance") ?? 0;
        return saveAccount(account?.id, {
          archived_at: account?.archived_at ?? null,
          name: text(d, "name")!,
          type,
          institution: text(d, "institution"),
          currency: text(d, "currency")!.toUpperCase(),
          // Credit card debt is stored negative; the form asks for it as a positive amount.
          opening_balance: credit ? -opening : opening,
          credit_limit: credit ? num(d, "credit_limit") : null,
          statement_day: credit ? num(d, "statement_day") : null,
          payment_due_day: credit ? num(d, "payment_due_day") : null,
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor="name">Nombre</FieldLabel>
        <Input id="name" name="name" required maxLength={100} defaultValue={account?.name} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="type">Tipo</FieldLabel>
          <NativeSelect
            id="type"
            className="w-full"
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
          >
            {Object.entries(ACCOUNT_TYPES).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="currency">Moneda</FieldLabel>
          <Input
            id="currency"
            name="currency"
            required
            minLength={3}
            maxLength={3}
            defaultValue={account?.currency ?? "MXN"}
            className="uppercase"
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="institution">Institución</FieldLabel>
        <Input
          id="institution"
          name="institution"
          maxLength={100}
          placeholder="BBVA, Nu, Banamex…"
          defaultValue={account?.institution ?? ""}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="opening_balance">
          {credit ? "Deuda inicial" : "Saldo inicial"}
        </FieldLabel>
        <Input
          id="opening_balance"
          name="opening_balance"
          type="number"
          step="0.01"
          min={credit ? 0 : undefined}
          defaultValue={account ? Math.abs(account.opening_balance) : 0}
        />
        <FieldDescription>Antes de cualquier movimiento registrado.</FieldDescription>
      </Field>
      {credit && (
        <>
          <Field>
            <FieldLabel htmlFor="credit_limit">Límite de crédito</FieldLabel>
            <Input
              id="credit_limit"
              name="credit_limit"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={account?.credit_limit ?? ""}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="statement_day">Día de corte</FieldLabel>
              <Input
                id="statement_day"
                name="statement_day"
                type="number"
                min={1}
                max={31}
                required
                defaultValue={account?.statement_day ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="payment_due_day">Día límite de pago</FieldLabel>
              <Input
                id="payment_due_day"
                name="payment_due_day"
                type="number"
                min={1}
                max={31}
                required
                defaultValue={account?.payment_due_day ?? ""}
              />
            </Field>
          </div>
        </>
      )}
    </FormDialog>
  );
}

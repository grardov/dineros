"use client";

import { useState } from "react";

import { FormDialog, MoneyInput, num, text } from "@/components/form-dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { deleteAccount, saveAccount } from "@/lib/actions";
import { findInstitution, INSTITUTIONS } from "@/lib/institutions";
import { useStore } from "@/lib/store";
import { ACCOUNT_TYPES, type Account, type AccountType, money } from "@/lib/types";

export const NAME_EXAMPLES: Record<AccountType, string> = {
  debit: "Ej. Nómina",
  credit: "Ej. Tarjeta Oro",
  cash: "Ej. Cartera",
  savings: "Ej. Fondo de emergencia",
  investment: "Ej. Cetes a 28 días",
};

export const CURRENCIES: Record<string, string> = {
  MXN: "MXN — Peso",
  USD: "USD — Dólar",
  EUR: "EUR — Euro",
};

const BY_NAME = INSTITUTIONS.toSorted((a, b) => a.name.localeCompare(b.name, "es"));
const OTHER = "__other";

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
  const { profile } = useStore();
  const [currency, setCurrency] = useState(account?.currency ?? profile.currency);
  // A saved name we know ("BBVA México") selects that institution; anything else is "Otra".
  const [institution, setInstitution] = useState(() =>
    account?.institution ? (findInstitution(account.institution)?.name ?? OTHER) : "",
  );
  const credit = type === "credit";
  // Live amounts for the "Disponible" hint under the credit limit.
  const [debt, setDebt] = useState(account ? Math.abs(account.opening_balance) : null);
  const [limit, setLimit] = useState(account?.credit_limit ?? null);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={account ? "Editar cuenta" : "Nueva cuenta"}
      onDelete={account && (() => deleteAccount(account.id))}
      onSubmit={(d) => {
        const opening = num(d, "opening_balance") ?? 0;
        const limit = credit ? num(d, "credit_limit") : null;
        const pending = credit ? num(d, "last_statement_pending") : null;
        if (limit === 0) return "El límite de crédito debe ser mayor a $0.";
        if (pending !== null && pending > opening)
          return "Lo que falta pagar del último corte no puede ser mayor que el saldo total.";
        return saveAccount(account?.id, {
          archived_at: account?.archived_at ?? null,
          name: text(d, "name")!,
          type,
          institution: text(d, "institution"),
          currency,
          // Credit card debt is stored negative; the form asks for it as a positive amount.
          opening_balance: credit ? -opening : opening,
          last_statement_pending: pending,
          credit_limit: limit,
          statement_day: credit ? num(d, "statement_day") : null,
          payment_due_day: credit ? num(d, "payment_due_day") : null,
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor="name">Nombre</FieldLabel>
        <Input
          id="name"
          name="name"
          required
          maxLength={100}
          placeholder={NAME_EXAMPLES[type]}
          defaultValue={account?.name}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <NativeSelect
            id="currency"
            className="w-full"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {/* Keeps a currency saved before this list existed selectable. */}
            {[...new Set([...Object.keys(CURRENCIES), currency])].map((code) => (
              <NativeSelectOption key={code} value={code}>
                {CURRENCIES[code] ?? code}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="institution">Institución</FieldLabel>
        <NativeSelect
          id="institution"
          name={institution === OTHER ? undefined : "institution"}
          className="w-full"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
        >
          <NativeSelectOption value="">Sin institución</NativeSelectOption>
          {BY_NAME.map((i) => (
            <NativeSelectOption key={i.id} value={i.name}>
              {i.name}
            </NativeSelectOption>
          ))}
          <NativeSelectOption value={OTHER}>Otra…</NativeSelectOption>
        </NativeSelect>
        {institution === OTHER && (
          <Input
            name="institution"
            aria-label="Nombre de la institución"
            required
            autoFocus
            maxLength={100}
            placeholder="Nombre de la institución"
            defaultValue={
              findInstitution(account?.institution ?? null) ? "" : (account?.institution ?? "")
            }
          />
        )}
      </Field>
      <Field>
        <FieldLabel htmlFor="opening_balance">
          {credit ? "Saldo total" : "Saldo inicial"}
        </FieldLabel>
        <MoneyInput
          id="opening_balance"
          name="opening_balance"
          currency={currency}
          defaultValue={account && Math.abs(account.opening_balance)}
          onValue={setDebt}
        />
        <FieldDescription>
          {credit
            ? "Todo lo que debes hoy, incluidas las compras después del último corte."
            : "Antes de cualquier movimiento registrado."}
        </FieldDescription>
      </Field>
      {credit && (
        <>
          <Field>
            <FieldLabel htmlFor="last_statement_pending">Por pagar del último corte</FieldLabel>
            <MoneyInput
              id="last_statement_pending"
              name="last_statement_pending"
              currency={currency}
              defaultValue={account?.last_statement_pending}
            />
            <FieldDescription>
              Lo que te falta pagar del último estado de cuenta para no generar intereses. Si lo
              dejas vacío, se toma el saldo total.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="credit_limit">Límite de crédito</FieldLabel>
            <MoneyInput
              id="credit_limit"
              name="credit_limit"
              currency={currency}
              defaultValue={account?.credit_limit}
              onValue={setLimit}
            />
            <FieldDescription>
              {limit
                ? `Disponible: ${money(limit - (debt ?? 0), currency)}. `
                : "Déjalo vacío si tu tarjeta no tiene límite fijo. "}
              Es el límite total, no el disponible: si tu banco solo muestra el disponible, súmale
              tu saldo total.
            </FieldDescription>
          </Field>
          <div className="grid grid-cols-2 items-end gap-4">
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

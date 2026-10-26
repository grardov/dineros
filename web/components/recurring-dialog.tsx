"use client";

import { useState } from "react";

import { FormDialog, MoneyInput, num, text } from "@/components/form-dialog";
import { CategorySelect, KindTabs } from "@/components/transaction-dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { deleteRecurring, saveRecurring } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { FREQUENCIES, type Recurring, type TransactionKind } from "@/lib/types";

const NAME_EXAMPLES: Record<TransactionKind, string> = {
  expense: "Ej. Renta",
  income: "Ej. Nómina",
  transfer: "Ej. Ahorro mensual",
};

// "2026-11" → "2026-11-30": a fijo that ends in a month still covers that whole month.
const lastDayOf = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};

const checkbox = "size-4 shrink-0 accent-primary";

export function RecurringDialog({
  recurring,
  open,
  onClose,
}: {
  recurring?: Recurring;
  open: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  const [kind, setKind] = useState<TransactionKind>(recurring?.kind ?? "expense");
  const [toAccountId, setToAccountId] = useState(recurring?.to_account_id ?? "");
  const [variable, setVariable] = useState(recurring?.is_variable ?? false);
  // A card payment can take the statement due each month instead of a fixed amount.
  const [fromStatement, setFromStatement] = useState(!recurring || recurring.amount === null);
  const card = store.account(toAccountId);
  const auto = kind === "transfer" && card?.type === "credit" && fromStatement;
  const accounts = store.accounts.filter(
    (a) => !a.archived_at || a.id === recurring?.account_id || a.id === recurring?.to_account_id,
  );

  const accountSelect = (name: string, controlled?: boolean) => (
    <NativeSelect
      id={name}
      name={name}
      className="w-full"
      required
      {...(controlled
        ? { value: toAccountId, onChange: (e) => setToAccountId(e.target.value) }
        : { defaultValue: recurring?.account_id ?? "" })}
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
      title={recurring ? "Editar fijo" : "Nuevo fijo"}
      saved={recurring ? "Fijo actualizado" : "Fijo creado"}
      deleted="Fijo eliminado"
      onDelete={recurring && (() => deleteRecurring(recurring.id))}
      onSubmit={(d) => {
        const account_id = text(d, "account_id")!;
        if (kind === "transfer" && toAccountId === account_id)
          return "Elige dos cuentas distintas.";
        const starts_on = `${text(d, "starts_on")}-01`;
        const endsYm = text(d, "ends_on");
        const ends_on = endsYm ? lastDayOf(endsYm) : null;
        if (ends_on && ends_on < starts_on) return "El último mes debe ser después del primero.";
        return saveRecurring(recurring?.id, {
          name: text(d, "name")!,
          kind,
          amount: auto ? null : num(d, "amount"),
          is_variable: !auto && variable,
          account_id,
          to_account_id: kind === "transfer" ? toAccountId : null,
          category_id: kind === "transfer" ? null : text(d, "category_id"),
          // A statement-based payment is due on the card's payment day, every month.
          day_of_month: auto ? card.payment_due_day! : num(d, "day_of_month")!,
          every_months: auto ? 1 : Number(d.get("every_months")),
          starts_on,
          ends_on,
          paused_at: d.get("paused") ? (recurring?.paused_at ?? new Date().toISOString()) : null,
        });
      }}
    >
      <KindTabs kind={kind} onChange={setKind} />
      <Field>
        <FieldLabel htmlFor="name">Nombre</FieldLabel>
        <Input
          id="name"
          name="name"
          required
          maxLength={100}
          placeholder={NAME_EXAMPLES[kind]}
          defaultValue={recurring?.name}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="account_id">
            {kind === "income" ? "Llega a" : kind === "transfer" ? "Desde" : "Se paga desde"}
          </FieldLabel>
          {accountSelect("account_id")}
        </Field>
        {kind === "transfer" ? (
          <Field>
            <FieldLabel htmlFor="to_account_id">Hacia</FieldLabel>
            {accountSelect("to_account_id", true)}
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor="category_id">Categoría</FieldLabel>
            <CategorySelect
              kind={kind}
              defaultValue={recurring?.kind === kind ? recurring.category_id : null}
            />
          </Field>
        )}
      </div>

      {kind === "transfer" && card?.type === "credit" && (
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className={`${checkbox} mt-0.5`}
            checked={fromStatement}
            onChange={(e) => setFromStatement(e.target.checked)}
          />
          <span className="flex flex-col gap-0.5">
            Pagar lo del estado de cuenta
            <span className="text-muted-foreground">
              Cada mes toma el pago para no generar intereses del corte que vence, el día{" "}
              {card.payment_due_day}.
            </span>
          </span>
        </label>
      )}

      {!auto && (
        <>
          <Field>
            <FieldLabel htmlFor="amount">{variable ? "Monto estimado" : "Monto"}</FieldLabel>
            <MoneyInput
              id="amount"
              name="amount"
              required
              currency={store.account(recurring?.account_id ?? null)?.currency ?? "MXN"}
              defaultValue={recurring?.amount}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className={checkbox}
                checked={variable}
                onChange={(e) => setVariable(e.target.checked)}
              />
              El monto cambia cada vez (luz, agua, gas…)
            </label>
            {variable && (
              <FieldDescription>
                Para proyectar se usa el promedio de tus últimos 3 pagos; mientras no haya, este
                estimado.
              </FieldDescription>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="day_of_month">Día del mes</FieldLabel>
              <Input
                id="day_of_month"
                name="day_of_month"
                type="number"
                min={1}
                max={31}
                required
                defaultValue={recurring?.day_of_month ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="every_months">Frecuencia</FieldLabel>
              <NativeSelect
                id="every_months"
                name="every_months"
                className="w-full"
                defaultValue={recurring?.every_months ?? 1}
              >
                {Object.entries(FREQUENCIES).map(([months, label]) => (
                  <NativeSelectOption key={months} value={months}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="starts_on">Primer mes</FieldLabel>
          <Input
            id="starts_on"
            name="starts_on"
            type="month"
            required
            defaultValue={(recurring?.starts_on ?? store.today).slice(0, 7)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="ends_on">Último mes</FieldLabel>
          <Input
            id="ends_on"
            name="ends_on"
            type="month"
            defaultValue={recurring?.ends_on?.slice(0, 7) ?? ""}
          />
        </Field>
      </div>
      <FieldDescription className="-mt-2">
        {auto
          ? "Desde qué mes cuenta. Sin último mes, sigue mientras tengas la tarjeta."
          : "Para bimestrales o anuales, el primer mes marca cuáles meses tocan. Sin último mes, no termina."}
      </FieldDescription>

      {recurring && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="paused"
            className={checkbox}
            defaultChecked={!!recurring.paused_at}
          />
          Pausado: no cuenta en la proyección
        </label>
      )}
    </FormDialog>
  );
}

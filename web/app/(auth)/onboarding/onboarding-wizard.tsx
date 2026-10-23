"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  LoaderCircleIcon,
  RepeatIcon,
  TagsIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CURRENCIES, NAME_EXAMPLES } from "@/components/account-dialog";
import { ACCOUNT_ICONS } from "@/components/finance";
import { MoneyInput } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { completeOnboarding } from "@/lib/actions";
import { INSTITUTIONS } from "@/lib/institutions";
import {
  ACCOUNT_TYPES,
  type AccountType,
  type Category,
  FREQUENCIES,
  MINUS,
  money,
} from "@/lib/types";

const STEPS = ["Tú", "Cuenta", "Categorías", "Fijos"];
const BY_NAME = INSTITUTIONS.toSorted((a, b) => a.name.localeCompare(b.name, "es"));

// Common fijos, each filed under the seeded category of the same name.
const SUGGESTED = [
  { name: "Renta", icon: "🔑", kind: "expense", every: 1, variable: false, day: 1 },
  { name: "Luz", icon: "⚡", kind: "expense", every: 2, variable: true, day: 10 },
  { name: "Internet", icon: "🌐", kind: "expense", every: 1, variable: false, day: 5 },
  { name: "Streaming", icon: "📺", kind: "expense", every: 1, variable: false, day: 18 },
  { name: "Nómina", icon: "💼", kind: "income", every: 1, variable: false, day: 15 },
] as const;

type Fijo = { on: boolean; amount: number | null; day: number };

function StepHeader({ step, title, children }: { step: string; title: string; children: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] text-muted-foreground">{step}</span>
      <h2 className="font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-pretty text-muted-foreground">{children}</p>
    </div>
  );
}

function Chip({ category, on, toggle }: { category: Category; on: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={toggle}
      className={`flex h-7.5 items-center gap-1.5 rounded-full border pr-2.5 pl-2 text-[0.8125rem] font-medium ${
        on
          ? "border-[#a8cbc1] bg-accent text-accent-foreground"
          : "bg-card text-subtle line-through"
      }`}
    >
      <span className={on ? "" : "opacity-45"}>{category.icon}</span>
      {category.name}
    </button>
  );
}

export function OnboardingWizard({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [type, setType] = useState<AccountType>("debit");
  const [accName, setAccName] = useState("");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [statementDay, setStatementDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [off, setOff] = useState<Set<string>>(new Set());
  const [fijos, setFijos] = useState<Record<string, Fijo>>(() =>
    Object.fromEntries(SUGGESTED.map((f) => [f.name, { on: false, amount: null, day: f.day }])),
  );

  const credit = type === "credit";
  const accTitle = accName.trim() || `${institution} ${ACCOUNT_TYPES[type]}`.trim();
  const tops = categories.filter((c) => !c.parent_id);
  const kept = tops.filter((c) => !off.has(c.id));
  const chosen = SUGGESTED.filter((f) => fijos[f.name].on);
  const isDay = (d: string | number) => Number(d) >= 1 && Number(d) <= 31;
  const valid = [
    name.trim() !== "",
    balance !== null && (!credit || (isDay(statementDay) && isDay(dueDay))),
    true,
    chosen.every((f) => fijos[f.name].amount && isDay(fijos[f.name].day)),
  ][step];
  const setFijo = (n: string, patch: Partial<Fijo>) =>
    setFijos((all) => ({ ...all, [n]: { ...all[n], ...patch } }));

  const finish = (withFijos: boolean) =>
    startTransition(async () => {
      const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
      const err = await completeOnboarding({
        display_name: name.trim(),
        currency,
        account: {
          name: accTitle,
          type,
          institution: institution || null,
          currency,
          // Credit card debt is stored negative; the form asks for it as a positive amount.
          opening_balance: credit ? -balance! : balance!,
          last_statement_pending: null,
          credit_limit: null,
          statement_day: credit ? Number(statementDay) : null,
          payment_due_day: credit ? Number(dueDay) : null,
          archived_at: null,
        },
        recurring: (withFijos ? chosen : []).map((f) => ({
          name: f.name,
          kind: f.kind,
          amount: fijos[f.name].amount,
          is_variable: f.variable,
          category_id: categories.find((c) => c.name === f.name && c.kind === f.kind)?.id ?? null,
          day_of_month: Number(fijos[f.name].day),
          every_months: f.every,
          starts_on: today,
        })),
        remove_category_ids: [...off],
      });
      setError(err);
      if (!err) setStep(4);
    });
  const next = () => (step === 3 ? finish(true) : setStep(step + 1));

  return (
    <div className="mt-14 w-full max-w-[560px] self-start overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(14_18_23/0.04),0_12px_32px_-8px_rgb(14_18_23/0.12)] sm:mt-16">
      {step < 4 && (
        <ol className="grid grid-cols-4 gap-2 px-6 pt-6 sm:px-8">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-col gap-2">
              <span className={`h-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
              <span
                className={`text-xs font-medium ${
                  i === step ? "text-foreground" : i < step ? "text-primary" : "text-subtle"
                }`}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !pending) next();
        }}
      >
        <div className="flex flex-col gap-6 px-6 pt-6 pb-8 sm:px-8">
          {step === 0 && (
            <>
              <StepHeader step="Paso 1 de 4" title="¿Cómo te llamamos?">
                Así te saludamos en tu resumen. Lo cambias cuando quieras en Ajustes.
              </StepHeader>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="display_name">Nombre</FieldLabel>
                  <Input
                    id="display_name"
                    autoFocus
                    maxLength={100}
                    placeholder="Ej. Mariana"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="currency">Moneda principal</FieldLabel>
                  <NativeSelect
                    id="currency"
                    className="w-full *:h-10"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {Object.entries(CURRENCIES).map(([code, label]) => (
                      <NativeSelectOption key={code} value={code}>
                        {label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>La usamos en tus nuevas cuentas.</FieldDescription>
                </Field>
              </FieldGroup>
            </>
          )}

          {step === 1 && (
            <>
              <StepHeader step="Paso 2 de 4" title="Agrega tu primera cuenta">
                Empieza por la que más usas. Las demás las agregas después.
              </StepHeader>
              <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-5 gap-2">
                {Object.entries(ACCOUNT_TYPES).map(([key, label]) => {
                  const Icon = ACCOUNT_ICONS[key as AccountType];
                  const on = key === type;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setType(key as AccountType)}
                      className={`flex flex-col items-center gap-2 rounded-[10px] border px-1 pt-3 pb-2.5 text-xs font-medium sm:text-[0.8125rem] ${
                        on ? "border-primary bg-[#f3f8f6] ring-3 ring-accent" : "bg-card"
                      }`}
                    >
                      <span
                        className={`grid size-9 place-items-center rounded-[10px] ${
                          key === "credit" ? "bg-foreground text-white" : "bg-secondary"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
              <FieldGroup className="gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="account_name">Nombre</FieldLabel>
                    <Input
                      id="account_name"
                      maxLength={100}
                      placeholder={NAME_EXAMPLES[type]}
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="institution">Institución</FieldLabel>
                    <NativeSelect
                      id="institution"
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
                    </NativeSelect>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="balance">
                    {credit ? "Saldo total" : "Saldo actual"}
                  </FieldLabel>
                  <MoneyInput
                    id="balance"
                    currency={currency}
                    defaultValue={balance}
                    onValue={setBalance}
                  />
                  <FieldDescription>
                    {credit
                      ? "Todo lo que debes hoy, incluidas las compras después del último corte."
                      : "Lo que tienes hoy. A partir de aquí registras tus movimientos."}
                  </FieldDescription>
                </Field>
                {credit && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="statement_day">Día de corte</FieldLabel>
                      <Input
                        id="statement_day"
                        type="number"
                        min={1}
                        max={31}
                        placeholder="Ej. 12"
                        value={statementDay}
                        onChange={(e) => setStatementDay(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="payment_due_day">Día límite de pago</FieldLabel>
                      <Input
                        id="payment_due_day"
                        type="number"
                        min={1}
                        max={31}
                        placeholder="Ej. 2"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </FieldGroup>
            </>
          )}

          {step === 2 && (
            <>
              <StepHeader step="Paso 3 de 4" title="Elige tus categorías">
                Ya preparamos las más comunes, con sus subcategorías. Quita las que no uses.
              </StepHeader>
              {(["expense", "income"] as const).map((kind) => (
                <div key={kind} className="flex flex-col gap-2.5">
                  <div className="flex justify-between text-[0.8125rem]">
                    <span className="font-semibold">
                      {kind === "expense" ? "Gastos" : "Ingresos"}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {kept.filter((c) => c.kind === kind).length} de{" "}
                      {tops.filter((c) => c.kind === kind).length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tops
                      .filter((c) => c.kind === kind)
                      .map((c) => (
                        <Chip
                          key={c.id}
                          category={c}
                          on={!off.has(c.id)}
                          toggle={() =>
                            setOff((s) => {
                              const n = new Set(s);
                              if (!n.delete(c.id)) n.add(c.id);
                              return n;
                            })
                          }
                        />
                      ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <StepHeader step="Paso 4 de 4 · Opcional" title="¿Tienes pagos fijos?">
                Los ves venir en tu resumen y los registras con un toque. Marca los que apliquen.
              </StepHeader>
              <div className="overflow-hidden rounded-[10px] border">
                {SUGGESTED.map((f, i) => {
                  const state = fijos[f.name];
                  return (
                    <div
                      key={f.name}
                      className={`grid grid-cols-[18px_1fr_104px_44px] items-center gap-3 px-3.5 py-2.5 sm:grid-cols-[18px_32px_1fr_128px_72px] ${
                        i ? "border-t" : ""
                      } ${state.on ? "bg-card" : "bg-sidebar"}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={f.name}
                        checked={state.on}
                        onChange={(e) => setFijo(f.name, { on: e.target.checked })}
                        className="size-4 accent-primary"
                      />
                      <span className="grid size-8 place-items-center rounded-[9px] bg-secondary text-base max-sm:hidden">
                        {f.icon}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">{f.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {f.kind === "income" ? "Ingreso" : "Gasto"} · {FREQUENCIES[f.every]}
                          {f.variable && " · variable"}
                        </span>
                      </div>
                      <div className={state.on ? "" : "opacity-40"}>
                        <MoneyInput
                          aria-label={`Monto de ${f.name}`}
                          defaultValue={state.amount}
                          onValue={(amount) => setFijo(f.name, { amount, on: amount !== null })}
                        />
                      </div>
                      <label
                        className={`flex items-center gap-1 text-xs text-muted-foreground ${
                          state.on ? "" : "opacity-40"
                        }`}
                      >
                        <span className="max-sm:sr-only">Día</span>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={state.day}
                          onChange={(e) => setFijo(f.name, { day: Number(e.target.value) })}
                          className="px-1 text-center tabular-nums"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <span className="text-[0.8125rem] text-muted-foreground">
                ¿Te pagan por quincena? Marca Nómina el día 15 y agrega la del 30 en Fijos.
              </span>
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-5 px-2 pt-6 text-center">
              <span className="grid size-14 place-items-center rounded-[18px] bg-accent text-accent-foreground">
                <CheckIcon className="size-7" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h2 className="font-heading text-[26px] font-semibold tracking-tight">
                  Todo listo, {name.trim().split(/\s+/)[0]}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Tu resumen ya está listo. Registra tu primer movimiento para verlo en acción.
                </p>
              </div>
              <div className="w-full divide-y rounded-[10px] border text-left">
                {[
                  {
                    Icon: ACCOUNT_ICONS[type],
                    dark: credit,
                    title: accTitle,
                    meta: `${ACCOUNT_TYPES[type]} · ${currency}`,
                    value: (credit ? MINUS : "") + money(balance ?? 0, currency),
                  },
                  {
                    Icon: TagsIcon,
                    title: "Categorías",
                    meta: "Con sus subcategorías",
                    value: kept.length,
                  },
                  {
                    Icon: RepeatIcon,
                    title: "Fijos",
                    meta: chosen.length ? "Los ves en tu resumen" : "Los agregas cuando quieras",
                    value: chosen.length,
                  },
                ].map(({ Icon, dark, title, meta, value }) => (
                  <div key={title} className="flex items-center gap-3 px-3.5 py-3">
                    <span
                      className={`grid size-8 place-items-center rounded-[9px] ${
                        dark
                          ? "bg-foreground text-white"
                          : dark === false
                            ? "bg-secondary"
                            : "bg-accent text-accent-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">{title}</span>
                      <span className="text-xs text-muted-foreground">{meta}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                size="lg"
                className="h-11 w-full"
                onClick={() => router.push("/")}
              >
                Ir a mi resumen
              </Button>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {step < 4 && (
          <div className="flex items-center gap-2 border-t bg-sidebar px-6 py-3.5 sm:px-8">
            {step > 0 && (
              <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeftIcon /> Atrás
              </Button>
            )}
            <div className="flex-1" />
            {step === 3 && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => finish(false)}
              >
                Omitir por ahora
              </Button>
            )}
            <Button type="submit" disabled={!valid || pending}>
              {pending && <LoaderCircleIcon className="animate-spin" />}
              {step < 3
                ? "Continuar"
                : chosen.length
                  ? `Guardar ${chosen.length} ${chosen.length === 1 ? "fijo" : "fijos"}`
                  : "Terminar"}
              {!pending && <ArrowRightIcon />}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

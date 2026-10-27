"use client";

import { useState } from "react";

import { FormDialog } from "@/components/form-dialog";
import { saveProfile } from "@/lib/actions";
import { useStore } from "@/lib/store";

const RULE = [
  {
    key: "needs_pct",
    label: "Necesidades",
    hint: "Vivienda, súper, servicios…",
    color: "var(--needs)",
  },
  { key: "wants_pct", label: "Deseos", hint: "Restaurantes, viajes…", color: "var(--wants)" },
  { key: "savings_pct", label: "Ahorro", hint: "Lo que te queda", color: "var(--savings)" },
] as const;

type Rule = Record<(typeof RULE)[number]["key"], number>;

// Moving one share takes the difference from the other two in proportion, so they always add up
// to 100 (evenly when the other two are both at 0).
function rebalance(rule: Rule, key: keyof Rule, value: number): Rule {
  const [a, b] = RULE.map((r) => r.key).filter((k) => k !== key);
  const rest = 100 - value;
  const sum = rule[a] + rule[b];
  const first = Math.round(sum ? (rest * rule[a]) / sum : rest / 2);
  return { ...rule, [key]: value, [a]: first, [b]: rest - first };
}

// The rule as a pie, set with one slider per share; `income` shows what each share means in money.
// With `activate`, saving it is what turns Salud financiera on.
export function RuleDialog({
  income,
  activate,
  onClose,
}: {
  income: number;
  activate?: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  const { profile } = store;
  const [rule, setRule] = useState<Rule>({
    needs_pct: profile.needs_pct,
    wants_pct: profile.wants_pct,
    savings_pct: profile.savings_pct,
  });
  const [months, setMonths] = useState(profile.emergency_months);

  // Each slice starts where the ones before it end.
  const stops = RULE.map(({ key, color }, i) => {
    const from = RULE.slice(0, i).reduce((sum, r) => sum + rule[r.key], 0);
    return `${color} ${from}% ${from + rule[key]}%`;
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title={activate ? "Arma tu regla" : "Tu regla"}
      submitLabel={activate ? "Activar" : "Guardar"}
      saved={activate ? "Salud financiera activada" : "Regla actualizada"}
      onSubmit={() =>
        saveProfile({
          ...rule,
          emergency_months: months,
          ...(activate && { health_started_at: new Date().toISOString() }),
        })
      }
    >
      <div className="flex items-center gap-5">
        <div
          role="img"
          aria-label={RULE.map(({ key, label }) => `${label} ${rule[key]}%`).join(", ")}
          className="size-28 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops.join(", ")})` }}
        />
        <p className="text-[0.8125rem] text-muted-foreground">
          Cómo quieres repartir lo que ganas. Mueve una parte y las otras dos se ajustan para sumar
          100%.
        </p>
      </div>

      {RULE.map(({ key, label, hint, color }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-2">
            <span
              className="size-2.5 shrink-0 self-center rounded-full"
              style={{ background: color }}
            />
            <label htmlFor={key} className="text-sm font-medium">
              {label}
            </label>
            <span className="truncate text-xs text-muted-foreground">{hint}</span>
            <span className="ml-auto text-sm font-semibold tabular-nums">{rule[key]}%</span>
          </div>
          <input
            id={key}
            type="range"
            min={0}
            max={100}
            step={1}
            value={rule[key]}
            onChange={(e) => setRule(rebalance(rule, key, e.target.valueAsNumber))}
            className="range w-full"
            style={{ "--range": color, "--fill": `${rule[key]}%` } as React.CSSProperties}
          />
          {income > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {store.money((income * rule[key]) / 100)} de {store.money(income)} al mes
            </span>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-1.5 border-t pt-4">
        <div className="flex items-baseline gap-2">
          <label htmlFor="emergency_months" className="text-sm font-medium">
            Fondo de emergencia
          </label>
          <span className="ml-auto text-sm font-semibold tabular-nums">
            {months} {months === 1 ? "mes" : "meses"}
          </span>
        </div>
        <input
          id="emergency_months"
          type="range"
          min={1}
          max={24}
          step={1}
          value={months}
          onChange={(e) => setMonths(e.target.valueAsNumber)}
          className="range w-full"
          style={
            {
              "--range": "var(--primary)",
              "--fill": `${((months - 1) / 23) * 100}%`,
            } as React.CSSProperties
          }
        />
        <span className="text-xs text-muted-foreground">
          Cuántos meses de necesidades quieres tener guardados.
        </span>
      </div>
    </FormDialog>
  );
}

"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { signedMoney } from "@/lib/types";

const FIJOS = [
  { name: "Renta", icon: "🔑", meta: "Vence el 1 oct", done: "Pagado", amount: -8500 },
  { name: "Nómina", icon: "💼", meta: "Llega el 15 oct", done: "Recibido", amount: 16000 },
  {
    name: "Luz",
    icon: "⚡",
    meta: "Vence el 29 oct · en 2 días · BBVA Débito",
    done: "Pagado",
    amount: -640,
    estimated: true,
  },
  {
    name: "Pago Nu Crédito",
    icon: "💳",
    meta: "Vence el 2 nov · en 6 días",
    done: "Pagado",
    amount: -8920.35,
  },
];

// A pretend month of fijos on the landing page: "Registrar" marks one as paid, like in the app.
export function FijosDemo() {
  const [paid, setPaid] = useState(["Renta", "Nómina"]);
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {FIJOS.map((f) => {
        const isPaid = paid.includes(f.name);
        return (
          <div
            key={f.name}
            className="flex items-center gap-3 border-t border-secondary px-3 py-3 first:border-t-0 sm:px-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-muted text-[17px]">
              {f.icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{f.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {isPaid ? `${f.done} · ${f.meta.split(" · ")[0].replace(/^\S+ /, "")}` : f.meta}
              </span>
            </div>
            {/* Amount above the action on phones, beside it from sm up. */}
            <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span
                className={`text-sm font-semibold tabular-nums ${
                  isPaid ? "text-subtle line-through" : f.amount > 0 ? "text-income" : ""
                }`}
              >
                {f.estimated && !isPaid && "≈ "}
                {signedMoney(f.amount)}
              </span>
              {isPaid ? (
                <span className="flex w-21 items-center justify-center gap-1 rounded-full bg-income-soft px-2 py-1 text-xs font-medium text-income">
                  <CheckIcon className="size-3" />
                  {f.done}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaid([...paid, f.name])}
                  className="h-7.5 w-21 cursor-pointer rounded-[7px] border border-input bg-card text-[13px] font-medium hover:bg-muted"
                >
                  Registrar
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-3 border-t bg-sidebar px-3 py-3.5 sm:px-4 text-[13px]">
        <span className="text-muted-foreground">Noviembre</span>
        <span className="flex flex-col items-end gap-0.5 tabular-nums">
          <b className="font-semibold">{signedMoney(-21340)}</b>
          <span className="text-xs text-muted-foreground">Te sobran $10,660.00</span>
        </span>
      </div>
    </div>
  );
}

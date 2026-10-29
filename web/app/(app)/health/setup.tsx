"use client";

import { HeartPulseIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState, PageHeader } from "@/components/finance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { RuleDialog } from "./rule-dialog";

const STEPS = [
  {
    title: "Arma tu regla",
    body: (
      <>
        Reparte lo que ganas en <b className="text-needs">necesidades</b>,{" "}
        <b className="text-wants">deseos</b> y <b className="text-savings">ahorro</b>. La más
        conocida es 50/30/20; ajústala a tus metas.
      </>
    ),
  },
  {
    title: "Clasifica tus gastos",
    body: (
      <>
        Tus categorías ya vienen como necesidad o deseo. Cambia las que no te queden en{" "}
        <Link
          href="/categories"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Categorías
        </Link>
        .
      </>
    ),
  },
  {
    title: "Revisa cada mes",
    body: "Ve si vas bien con tu regla, cuánto te cubre tu fondo de emergencia y cómo van tus tarjetas y tus fijos.",
  },
];

// What the page does, before the user has a rule: three steps and the button that sets it up.
export function HealthSetup({ income }: { income: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="Salud financiera" />
      <Card className="gap-0 py-0">
        <EmptyState icon={HeartPulseIcon} title="Conoce qué tan sanas están tus finanzas">
          Decide cómo quieres repartir lo que ganas y Dineros te dice cada mes si vas bien, con tus
          propios movimientos.
        </EmptyState>
        <ol className="grid gap-5 border-t px-6 py-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{step.title}</span>
                <p className="text-[0.8125rem] text-pretty text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex justify-center border-t px-6 py-5">
          <Button size="lg" onClick={() => setOpen(true)}>
            <HeartPulseIcon /> Activar salud financiera
          </Button>
        </div>
      </Card>
      {open && <RuleDialog activate income={income} onClose={() => setOpen(false)} />}
    </>
  );
}

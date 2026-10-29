import type { Metadata } from "next";

import { PageHeader } from "@/components/finance";

import { SavingsCalculator } from "../calculator";

export const metadata: Metadata = { title: "Calculadora de ahorro" };

export default function CalculatorPage() {
  return (
    <>
      <PageHeader eyebrow="Salud financiera" title="Calculadora de ahorro" />
      <SavingsCalculator />
    </>
  );
}

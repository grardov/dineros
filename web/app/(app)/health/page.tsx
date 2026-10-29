import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { MonthlyTotal } from "@/lib/types";

import { Health } from "./health";

export const metadata: Metadata = { title: "Salud financiera" };

// Totals per month come from core, so the trend isn't cut short by the transactions the store loads.
async function HealthData() {
  await connection();
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 6); // this month, the five before it, and one more for the fondo's average
  const since = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const totals = await api<(Omit<MonthlyTotal, "amount"> & { amount: string })[]>(
    `/transactions/monthly/?since=${since}`,
  );
  return <Health totals={totals.map((t) => ({ ...t, amount: Number(t.amount) }))} />;
}

export default function HealthPage() {
  return (
    <Suspense
      fallback={
        <div aria-busy className="flex flex-col gap-5">
          <span className="sr-only">Cargando tu salud financiera…</span>
          <Skeleton className="h-8 w-56" />
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </CardContent>
          </Card>
        </div>
      }
    >
      <HealthData />
    </Suspense>
  );
}

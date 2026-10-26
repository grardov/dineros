import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { getProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase";
import type { Category } from "@/lib/types";

import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Bienvenida · Dineros" };

// First visit after signing up; the (app) layout sends anyone not onboarded here.
export default function OnboardingPage() {
  return (
    <Suspense fallback={<Spinner>Preparando tu cuenta…</Spinner>}>
      <Onboarding />
    </Suspense>
  );
}

async function Onboarding() {
  await connection();
  const profile = await getProfile();
  if (profile.onboarded_at) redirect("/");
  const supabase = await createClient();
  const [{ data }, categories] = await Promise.all([
    supabase.auth.getClaims(),
    api<Category[]>("/categories/"),
  ]);

  return (
    <>
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-5 md:px-8 md:py-6">
        <Logo />
        <form action={signOut} className="flex items-center gap-1 text-[0.8125rem]">
          <span className="truncate text-muted-foreground max-sm:hidden">
            {data?.claims.email} ·
          </span>
          <button type="submit" className="-m-2 p-2 font-medium text-primary hover:underline">
            Salir
          </button>
        </form>
      </header>
      <OnboardingWizard categories={categories} />
    </>
  );
}

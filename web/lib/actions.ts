"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import type { Account, Category, Profile, Recurring, Transaction } from "@/lib/types";

// Writes go through core; on success the router refreshes so the store reloads.
// They return an error message for the dialog, or null.

type Input<T> = Omit<T, "id" | "created_at">;

async function write(
  path: string,
  init: RequestInit,
  conflict = "No se pudo guardar. Revisa los datos.",
) {
  try {
    await api(path, init);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    return e.status === 409 ? conflict : "Algo salió mal. Intenta de nuevo.";
  }
  refresh();
  return null;
}

const save = (resource: string, id: string | undefined, body: unknown, conflict?: string) =>
  write(
    id ? `/${resource}/${id}` : `/${resource}/`,
    { method: id ? "PUT" : "POST", body: JSON.stringify(body) },
    conflict,
  );

export async function saveAccount(id: string | undefined, body: Input<Account>) {
  return save("accounts", id, body);
}

// Only offered from the account's own page, so it leaves for the list.
export async function deleteAccount(id: string) {
  const error = await write(
    `/accounts/${id}`,
    { method: "DELETE" },
    "La cuenta tiene movimientos. Archívala en su lugar.",
  );
  if (error) return error;
  redirect("/accounts");
}

export async function saveCategory(id: string | undefined, body: Input<Category>) {
  return save("categories", id, body, "Ya existe una categoría con ese nombre.");
}

export async function deleteCategory(id: string) {
  return write(`/categories/${id}`, { method: "DELETE" });
}

export async function saveTransaction(id: string | undefined, body: Input<Transaction>) {
  return save("transactions", id, body);
}

export async function deleteTransaction(id: string) {
  return write(`/transactions/${id}`, { method: "DELETE" });
}

export async function saveRecurring(id: string | undefined, body: Input<Recurring>) {
  return save("recurring", id, body);
}

// Its transactions stay, just no longer linked.
export async function deleteRecurring(id: string) {
  return write(`/recurring/${id}`, { method: "DELETE" });
}

export async function saveProfile(body: Pick<Profile, "display_name" | "currency">) {
  return write("/profile/", { method: "PUT", body: JSON.stringify(body) });
}

export type OnboardingInput = Pick<Profile, "currency"> & {
  display_name: string;
  account: Input<Account>;
  recurring: Omit<Input<Recurring>, "account_id" | "to_account_id" | "ends_on" | "paused_at">[];
  remove_category_ids: string[];
};

// No refresh: the wizard shows its summary before moving on to Resumen.
export async function completeOnboarding(body: OnboardingInput) {
  try {
    await api("/profile/onboarding", { method: "POST", body: JSON.stringify(body) });
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    return "Algo salió mal. Intenta de nuevo.";
  }
  return null;
}

// Everything goes with the user; their session cookie would only point at nobody.
export async function deleteUser() {
  const error = await write("/profile/", { method: "DELETE" });
  if (error) return error;
  await (await createClient()).auth.signOut({ scope: "local" });
  redirect("/login");
}

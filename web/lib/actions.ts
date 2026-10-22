"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import type { Account, Category, Transaction } from "@/lib/types";

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
  redirect("/cuentas");
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

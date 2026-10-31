import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase";

// web never talks to the database: every entity is read/written through core, as the signed-in
// user (core verifies the JWT and Postgres RLS scopes the data to them).
const CORE_API_URL = process.env.CORE_API_URL ?? "http://localhost:8100/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
  ) {
    super(`core ${status}`);
  }
}

// The raw response from core, as the signed-in user. Content-Type is left to the body (FormData
// sets its own boundary).
export async function coreFetch(path: string, init?: RequestInit) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/login");

  const res = await fetch(`${CORE_API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${data.session.access_token}`, ...init?.headers },
  });
  if (res.status === 401) redirect("/login");
  return res;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await coreFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

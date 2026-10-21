"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase";

// email is echoed back because React resets the form after an action.
export type AuthState = { email: string; error?: string; message?: string } | null;

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = {
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  };
  const supabase = await createClient();

  if (formData.get("intent") === "signup") {
    const { data, error } = await supabase.auth.signUp(credentials);
    if (error) return { email: credentials.email, error: error.message };
    // With email confirmation on (production), there is no session until the link is opened.
    if (!data.session) {
      return {
        email: credentials.email,
        message: "Te enviamos un correo para confirmar tu cuenta.",
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) return { email: credentials.email, error: "Correo o contraseña incorrectos." };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase";

export type Intent = "signin" | "signup";

// email is echoed back because React resets the form after an action;
// intent lets the form hide a result once the user switches mode.
export type AuthState = {
  email: string;
  intent: Intent;
  error?: string;
  message?: string;
} | null;

const signUpErrors: Record<string, string> = {
  user_already_exists: "Ya existe una cuenta con ese correo. Inicia sesión.",
  weak_password: "La contraseña es muy débil. Usa al menos 6 caracteres.",
  email_address_invalid: "Ese correo no es válido.",
  over_email_send_rate_limit: "Demasiados intentos. Espera un momento y vuelve a intentar.",
};

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = {
    email: String(formData.get("email")).trim(),
    password: String(formData.get("password")),
  };
  const intent: Intent = formData.get("intent") === "signup" ? "signup" : "signin";
  const supabase = await createClient();

  if (intent === "signup") {
    const { data, error } = await supabase.auth.signUp(credentials);
    if (error) {
      return {
        email: credentials.email,
        intent,
        error: signUpErrors[error.code ?? ""] ?? "No pudimos crear tu cuenta. Intenta de nuevo.",
      };
    }
    // With email confirmation on (production), there is no session until the link is opened.
    if (!data.session) {
      return {
        email: credentials.email,
        intent,
        message: `Te enviamos un correo a ${credentials.email} para confirmar tu cuenta.`,
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      return { email: credentials.email, intent, error: "Correo o contraseña incorrectos." };
    }
  }
  redirect("/");
}

export type RecoveryState = { email: string; error?: string; sent?: boolean } | null;

export async function requestPasswordReset(
  _prev: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const email = String(formData.get("email")).trim();
  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { email, error: "Demasiados intentos. Espera un momento y vuelve a intentar." };
  }
  // Same answer whether or not the account exists, so the form can't be used to probe emails.
  return { email, sent: true };
}

export type PasswordState = { error?: string } | null;

const updateErrors: Record<string, string> = {
  same_password: "La nueva contraseña debe ser distinta a la actual.",
  weak_password: "La contraseña es muy débil. Usa al menos 6 caracteres.",
};

export async function updatePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: String(formData.get("password")) });
  if (error) {
    return {
      error:
        updateErrors[error.code ?? ""] ?? "No pudimos cambiar tu contraseña. Intenta de nuevo.",
    };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

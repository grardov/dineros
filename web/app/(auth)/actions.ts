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

const MIN_PASSWORD = 8; // Supabase's own minimum may be lower; this is the one that counts.
const weakPassword = `La contraseña es muy débil. Usa al menos ${MIN_PASSWORD} caracteres.`;
const tooManyAttempts = "Demasiados intentos. Espera un momento y vuelve a intentar.";
const captchaFailed = "No pudimos verificar que eres una persona. Intenta de nuevo.";

const signUpErrors: Record<string, string> = {
  user_already_exists: "Ya existe una cuenta con ese correo. Inicia sesión.",
  weak_password: weakPassword,
  email_address_invalid: "Ese correo no es válido.",
  over_email_send_rate_limit: tooManyAttempts,
  over_request_rate_limit: tooManyAttempts,
  captcha_failed: captchaFailed,
};

const signInErrors: Record<string, string> = {
  over_request_rate_limit: tooManyAttempts,
  captcha_failed: captchaFailed,
};

// Turnstile's token (see Captcha in auth-ui.tsx); Supabase Auth checks it when captcha is enabled.
const captchaToken = (formData: FormData) =>
  (formData.get("cf-turnstile-response") as string | null) || undefined;

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = {
    email: String(formData.get("email")).trim(),
    password: String(formData.get("password")),
  };
  const intent: Intent = formData.get("intent") === "signup" ? "signup" : "signin";
  const options = { captchaToken: captchaToken(formData) };
  const supabase = await createClient();

  if (intent === "signup") {
    if (credentials.password.length < MIN_PASSWORD) {
      return { email: credentials.email, intent, error: weakPassword };
    }
    // The confirmation link would otherwise land on the Site URL, which is now the landing page.
    const origin = (await headers()).get("origin");
    const { data, error } = await supabase.auth.signUp({
      ...credentials,
      options: { ...options, emailRedirectTo: `${origin}/login` },
    });
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
    const { error } = await supabase.auth.signInWithPassword({ ...credentials, options });
    if (error) {
      return {
        email: credentials.email,
        intent,
        error: signInErrors[error.code ?? ""] ?? "Correo o contraseña incorrectos.",
      };
    }
  }
  redirect("/dashboard");
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
    captchaToken: captchaToken(formData),
  });
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { email, error: tooManyAttempts };
  }
  if (error?.code === "captcha_failed") return { email, error: captchaFailed };
  // Same answer whether or not the account exists, so the form can't be used to probe emails.
  return { email, sent: true };
}

export type PasswordState = { error?: string } | null;

const updateErrors: Record<string, string> = {
  same_password: "La nueva contraseña debe ser distinta a la actual.",
  weak_password: weakPassword,
};

// How long after opening a recovery link its session may set a new password.
const RECOVERY_WINDOW_S = 60 * 60;

export async function updatePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const password = String(formData.get("password"));
  if (password.length < MIN_PASSWORD) return { error: weakPassword };
  const supabase = await createClient();
  // Only a session that just came from a recovery link (/auth/confirm) can set a password without
  // knowing the current one; any other (maybe stolen) session can't take over the account this way.
  // Recovery shows up as "otp" (token_hash link) or "recovery" (PKCE link).
  const { data } = await supabase.auth.getClaims();
  const now = Date.now() / 1000;
  const recovered = data?.claims.amr?.some(
    (a) =>
      typeof a === "object" &&
      (a.method === "otp" || a.method === "recovery") &&
      now - a.timestamp < RECOVERY_WINDOW_S,
  );
  if (!recovered)
    return { error: "El enlace expiró. Pide uno nuevo desde “¿Olvidaste tu contraseña?”." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        updateErrors[error.code ?? ""] ?? "No pudimos cambiar tu contraseña. Intenta de nuevo.",
    };
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Ends every session of the user, this one included.
export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { authenticate, type Intent } from "../actions";
import { AuthCard, FormAlert, PasswordInput, SubmitButton } from "../auth-ui";

const copy = {
  signin: {
    title: "Bienvenido de nuevo",
    description: "Entra con tu correo para ver tus finanzas.",
    submit: "Entrar",
    pending: "Entrando…",
    switchPrompt: "¿No tienes cuenta?",
    switchAction: "Crea una",
  },
  signup: {
    title: "Crea tu cuenta",
    description: "Empieza a llevar tus cuentas en un minuto.",
    submit: "Crear cuenta",
    pending: "Creando cuenta…",
    switchPrompt: "¿Ya tienes cuenta?",
    switchAction: "Inicia sesión",
  },
} as const;

export function LoginForm() {
  const [state, action, pending] = useActionState(authenticate, null);
  const [mode, setMode] = useState<Intent>("signin");
  const t = copy[mode];
  // A result only belongs to the mode that produced it.
  const result = state?.intent === mode ? state : null;

  return (
    <AuthCard
      title={t.title}
      description={t.description}
      footer={
        <>
          {t.switchPrompt}
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 font-medium"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {t.switchAction}
          </Button>
        </>
      }
    >
      <form action={action}>
        <input type="hidden" name="intent" value={mode} />
        <FieldGroup className="gap-4">
          {result?.error && <FormAlert tone="error">{result.error}</FormAlert>}
          {result?.message && <FormAlert tone="success">{result.message}</FormAlert>}

          <Field>
            <FieldLabel htmlFor="email">Correo</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="tu@correo.com"
              defaultValue={state?.email}
              aria-invalid={!!result?.error || undefined}
              className="h-10"
            />
          </Field>

          {/* The reset link sits by the label but comes after the input, so Tab goes email → password. */}
          <Field className="relative">
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              aria-invalid={!!result?.error || undefined}
              aria-describedby={mode === "signup" ? "password-hint" : undefined}
            />
            {mode === "signup" && (
              <FieldDescription id="password-hint">Mínimo 6 caracteres.</FieldDescription>
            )}
            {mode === "signin" && (
              <Link
                href="/login/recuperar"
                className="absolute top-0 right-0 w-auto! text-sm leading-snug text-primary underline-offset-4 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            )}
          </Field>

          <SubmitButton pending={pending} pendingLabel={t.pending}>
            {t.submit}
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}

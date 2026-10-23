"use client";

import { useActionState } from "react";

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";

import { updatePassword } from "../actions";
import { AuthCard, FormAlert, PasswordInput, SubmitButton } from "../auth-ui";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);

  return (
    <AuthCard
      title="Elige una nueva contraseña"
      description="Al guardarla entrarás directo a tu cuenta."
    >
      <form action={action}>
        <FieldGroup className="gap-4">
          {state?.error && <FormAlert tone="error">{state.error}</FormAlert>}
          <Field>
            <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
            <PasswordInput
              id="password"
              autoFocus
              autoComplete="new-password"
              minLength={8}
              aria-invalid={!!state?.error || undefined}
              aria-describedby="password-hint"
            />
            <FieldDescription id="password-hint">Mínimo 8 caracteres.</FieldDescription>
          </Field>
          <SubmitButton pending={pending} pendingLabel="Guardando…">
            Guardar contraseña
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}

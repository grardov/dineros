"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { requestPasswordReset } from "../../actions";
import { AuthCard, Captcha, FormAlert, SubmitButton } from "../../auth-ui";

// /auth/confirm sends people back here when their link is expired or already used.
function ExpiredLinkAlert() {
  if (useSearchParams().get("error") !== "expired-link") return null;
  return <FormAlert tone="error">El enlace expiró o ya se usó. Pide uno nuevo.</FormAlert>;
}

export function RecoverForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  return (
    <AuthCard
      title={state?.sent ? "Revisa tu correo" : "Recupera tu contraseña"}
      description={
        state?.sent
          ? "El enlace vence en una hora y solo se puede usar una vez."
          : "Escribe tu correo y te enviaremos un enlace para restablecerla."
      }
      footer={
        <Link
          href="/login"
          className="flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          Volver a iniciar sesión
        </Link>
      }
    >
      <form action={action}>
        <FieldGroup className="gap-4">
          {state?.sent ? (
            <>
              <FormAlert tone="success">
                Si hay una cuenta con <strong className="font-medium">{state.email}</strong>, el
                enlace llegará en unos minutos. Revisa también la carpeta de spam.
              </FormAlert>
              <input type="hidden" name="email" value={state.email} />
              <Button
                type="submit"
                variant="outline"
                size="lg"
                disabled={pending}
                className="w-full"
              >
                {pending ? "Reenviando…" : "Reenviar correo"}
              </Button>
            </>
          ) : (
            <>
              {state?.error ? (
                <FormAlert tone="error">{state.error}</FormAlert>
              ) : (
                <Suspense>
                  <ExpiredLinkAlert />
                </Suspense>
              )}
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
                  className="h-10"
                />
              </Field>
              <SubmitButton pending={pending} pendingLabel="Enviando…">
                Enviar enlace
              </SubmitButton>
            </>
          )}
          {/* Also covers "Reenviar correo". */}
          <Captcha resetOn={state} />
        </FieldGroup>
      </form>
    </AuthCard>
  );
}

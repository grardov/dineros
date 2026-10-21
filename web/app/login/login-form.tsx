"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { authenticate } from "./actions";

const inputClass = "rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function LoginForm() {
  const [state, action, pending] = useActionState(authenticate, null);
  return (
    <form action={action} className="flex w-full max-w-xs flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Correo
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state?.email}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Contraseña
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className={inputClass}
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.message && <p className="text-sm">{state.message}</p>}
      <Button type="submit" name="intent" value="signin" disabled={pending}>
        Entrar
      </Button>
      <Button type="submit" name="intent" value="signup" variant="outline" disabled={pending}>
        Crear cuenta
      </Button>
    </form>
  );
}

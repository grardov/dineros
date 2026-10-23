"use client";

import { DownloadIcon, LoaderCircleIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { requestPasswordReset, signOutEverywhere } from "@/app/(auth)/actions";
import { CURRENCIES } from "@/components/account-dialog";
import { PageHeader } from "@/components/finance";
import { Avatar, initials } from "@/components/user-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { deleteUser, saveProfile } from "@/lib/actions";
import { useStore } from "@/lib/store";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col gap-1 md:pt-1">
        <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-[0.8125rem] text-pretty text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card max-md:mb-4">
        {children}
      </div>
    </>
  );
}

function Row({
  title,
  description,
  danger,
  children,
}: {
  title: string;
  description: React.ReactNode;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4">
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
        <span className={`text-sm font-medium ${danger ? "text-destructive" : ""}`}>{title}</span>
        <span className="text-[0.8125rem] text-muted-foreground">{description}</span>
      </div>
      {children}
    </div>
  );
}

export function Settings() {
  const { email, profile } = useStore();
  const [name, setName] = useState(profile.display_name ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reset, requestReset, resetting] = useActionState(requestPasswordReset, null);
  const dirty = name.trim() !== "" && name.trim() !== profile.display_name;
  const since = new Date(profile.created_at).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const save = (patch: Partial<Parameters<typeof saveProfile>[0]>) =>
    startTransition(async () => {
      const err = await saveProfile({
        display_name: profile.display_name,
        currency: profile.currency,
        ...patch,
      });
      setError(err);
      setSaved(!err);
    });

  return (
    <>
      <PageHeader eyebrow="Mi cuenta" title="Ajustes" />
      <div className="grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,260px)_minmax(0,640px)] md:gap-y-5">
        <Section title="Perfil" description="Cómo apareces en Dineros.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (dirty) save({ display_name: name.trim() });
            }}
          >
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3.5">
                <Avatar
                  label={initials(profile.display_name, email)}
                  className="size-13! text-lg"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="font-heading text-base font-semibold">
                    {profile.display_name ?? email}
                  </span>
                  <span className="text-[0.8125rem] text-muted-foreground">
                    Miembro desde {since}
                  </span>
                </div>
              </div>
              <Field>
                <FieldLabel htmlFor="display_name">Nombre</FieldLabel>
                <Input
                  id="display_name"
                  maxLength={100}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Correo</FieldLabel>
                <Input id="email" value={email} disabled />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 border-t bg-sidebar px-5 py-3.5">
              {error && (
                <span role="alert" className="text-[0.8125rem] text-destructive">
                  {error}
                </span>
              )}
              {saved && (
                <span role="status" className="text-[0.8125rem] text-income">
                  Cambios guardados
                </span>
              )}
              <Button type="submit" disabled={!dirty || pending}>
                {pending && <LoaderCircleIcon className="animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        </Section>

        <Section title="Preferencias" description="La moneda con la que empiezan tus cuentas.">
          <Row title="Moneda principal" description="La proponemos al crear una cuenta nueva.">
            <NativeSelect
              aria-label="Moneda principal"
              className="w-44"
              value={profile.currency}
              disabled={pending}
              onChange={(e) => save({ currency: e.target.value })}
            >
              {[...new Set([...Object.keys(CURRENCIES), profile.currency])].map((code) => (
                <NativeSelectOption key={code} value={code}>
                  {CURRENCIES[code] ?? code}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Row>
        </Section>

        <Section title="Seguridad" description="Acceso a tu cuenta.">
          <Row
            title="Contraseña"
            description={
              reset?.sent
                ? `Te enviamos un enlace a ${email}.`
                : (reset?.error ?? "Te enviamos un enlace para crear una nueva.")
            }
          >
            <form action={requestReset}>
              <input type="hidden" name="email" value={email} />
              <Button type="submit" variant="outline" disabled={resetting}>
                {resetting && <LoaderCircleIcon className="animate-spin" />}
                Cambiar contraseña
              </Button>
            </form>
          </Row>
          <Row
            title="Sesiones"
            description="Cierra la sesión en todos tus dispositivos, incluido este."
          >
            <form action={signOutEverywhere}>
              <Button type="submit" variant="outline">
                Cerrar todas
              </Button>
            </form>
          </Row>
        </Section>

        <Section title="Tus datos" description="Son tuyos: llévatelos o bórralos.">
          <Row title="Exportar" description="Todos tus movimientos en CSV, con cuenta y categoría.">
            <a href="/settings/export" download className={buttonVariants({ variant: "outline" })}>
              <DownloadIcon /> Descargar
            </a>
          </Row>
          <Row
            title="Eliminar cuenta"
            description="Borra tu usuario y todos tus datos. No se puede deshacer."
            danger
          >
            <DeleteUser />
          </Row>
        </Section>
      </div>
    </>
  );
}

function DeleteUser() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" className="text-destructive hover:text-destructive" />}
      >
        Eliminar…
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borran tu usuario, cuentas, categorías, fijos y movimientos. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() => startTransition(async () => setError(await deleteUser()))}
          >
            {pending && <LoaderCircleIcon className="animate-spin" />}
            Eliminar todo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

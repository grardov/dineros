"use client";

import { DownloadIcon, LoaderCircleIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { requestPasswordReset, signOutEverywhere } from "@/app/(auth)/actions";
import { CURRENCIES } from "@/components/account-dialog";
import { PageHeader, SPENDING_LEVELS, SpendingGrid, addDays } from "@/components/finance";
import { ShareButtons, shareText } from "@/components/share";
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
import { toast } from "@/components/ui/toast";
import { deleteUser, saveProfile } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { CFDI_USES, type Profile, TAX_REGIMES } from "@/lib/types";

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
  const [pending, startTransition] = useTransition();
  const [reset, requestReset, resetting] = useActionState(requestPasswordReset, null);
  const dirty = name.trim() !== "" && name.trim() !== profile.display_name;
  const since = new Date(profile.created_at).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const save = (patch: Parameters<typeof saveProfile>[0]) =>
    startTransition(async () => {
      const err = await saveProfile(patch);
      toast.add(
        err ? { title: err, type: "error" } : { title: "Cambios guardados", type: "success" },
      );
    });

  return (
    <>
      <PageHeader eyebrow="Mi cuenta" title="Ajustes" />
      <div className="grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-[minmax(0,260px)_minmax(0,640px)] md:gap-y-5">
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
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Correo</FieldLabel>
                <Input id="email" value={email} disabled />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 border-t bg-sidebar px-5 py-3.5">
              <Button type="submit" disabled={!dirty || pending}>
                {pending && <LoaderCircleIcon className="animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        </Section>

        <Section title="Tu año" description="Lo que gastaste cada día, sin contar fijos.">
          <YearSpending />
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

        <Section
          title="Datos fiscales"
          description="Para pedir factura: compártelos en vez de dictarlos."
        >
          <FiscalData profile={profile} email={email} />
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

// The last 12 months; on narrow screens it scrolls (swipe or arrows), starting at today (the rtl
// wrapper).
function YearSpending() {
  const store = useStore();
  const from = addDays(store.today, -364);
  const days = Array.from({ length: 365 }, (_, i) => addDays(from, i));
  const total = days.reduce((s, d) => s + store.spentOn(d), 0);
  const free = days.filter((d) => !store.spentOn(d)).length;
  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="no-scrollbar overflow-x-auto [direction:rtl]">
        <div className="mr-auto w-max [direction:ltr]">
          <SpendingGrid
            from={from}
            to={store.today}
            months
            label="Gasto variable por día en los últimos 12 meses"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {store.money(total)} en el año · {free} días sin gastos
        </span>
        <span className="flex items-center gap-[3px]" aria-hidden>
          Menos
          {SPENDING_LEVELS.map((c) => (
            <span key={c} className={`size-[9px] rounded-[2px] ${c}`} />
          ))}
          Más
        </span>
      </div>
    </div>
  );
}

const label = (catalog: Record<string, string>, code: string | null) =>
  code && `${code} · ${catalog[code] ?? ""}`;

function FiscalData({ profile, email }: { profile: Profile; email: string }) {
  const [pending, startTransition] = useTransition();
  const text = shareText("Datos fiscales", [
    ["RFC", profile.rfc],
    ["Nombre", profile.legal_name],
    ["Código postal", profile.tax_zip],
    ["Régimen fiscal", label(TAX_REGIMES, profile.tax_regime)],
    ["Uso de CFDI", label(CFDI_USES, profile.cfdi_use)],
    ["Correo", email],
  ]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        const value = (key: string) => String(d.get(key) ?? "").trim() || null;
        const rfc = value("rfc")?.toUpperCase() ?? null;
        const zip = value("tax_zip");
        if (rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/.test(rfc))
          return void toast.add({
            title: "El RFC no es válido: son 12 o 13 caracteres, con homoclave.",
            type: "error",
          });
        if (zip && !/^\d{5}$/.test(zip))
          return void toast.add({ title: "El código postal son 5 dígitos.", type: "error" });
        startTransition(async () => {
          const err = await saveProfile({
            rfc,
            legal_name: value("legal_name")?.toUpperCase() ?? null,
            tax_zip: zip,
            tax_regime: value("tax_regime"),
            cfdi_use: value("cfdi_use"),
          });
          toast.add(
            err ? { title: err, type: "error" } : { title: "Cambios guardados", type: "success" },
          );
        });
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Field>
            <FieldLabel htmlFor="rfc">RFC</FieldLabel>
            <Input
              id="rfc"
              name="rfc"
              maxLength={13}
              autoComplete="off"
              className="uppercase placeholder:normal-case"
              placeholder="Con homoclave"
              defaultValue={profile.rfc ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tax_zip">Código postal</FieldLabel>
            <Input
              id="tax_zip"
              name="tax_zip"
              inputMode="numeric"
              maxLength={5}
              autoComplete="postal-code"
              defaultValue={profile.tax_zip ?? ""}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="legal_name">Nombre o razón social</FieldLabel>
          <Input
            id="legal_name"
            name="legal_name"
            maxLength={254}
            className="uppercase placeholder:normal-case"
            placeholder="Tal cual aparece en tu Constancia de Situación Fiscal"
            defaultValue={profile.legal_name ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="tax_regime">Régimen fiscal</FieldLabel>
          <NativeSelect
            id="tax_regime"
            name="tax_regime"
            className="w-full"
            defaultValue={profile.tax_regime ?? ""}
          >
            <NativeSelectOption value="">Sin elegir</NativeSelectOption>
            {Object.keys(TAX_REGIMES).map((code) => (
              <NativeSelectOption key={code} value={code}>
                {label(TAX_REGIMES, code)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="cfdi_use">Uso de CFDI habitual</FieldLabel>
          <NativeSelect
            id="cfdi_use"
            name="cfdi_use"
            className="w-full"
            defaultValue={profile.cfdi_use ?? ""}
          >
            <NativeSelectOption value="">Sin elegir</NativeSelectOption>
            {Object.keys(CFDI_USES).map((code) => (
              <NativeSelectOption key={code} value={code}>
                {label(CFDI_USES, code)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-sidebar px-5 py-3.5">
        {profile.rfc && (
          <div className="mr-auto flex gap-2">
            <ShareButtons text={text} />
          </div>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          Guardar
        </Button>
      </div>
    </form>
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

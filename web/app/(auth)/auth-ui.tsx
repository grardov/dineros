"use client";

import {
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  MailCheckIcon,
} from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// Pieces shared by the login, recovery and new-password screens.

export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full max-w-sm gap-6 shadow-[0_1px_2px_rgb(14_18_23/0.04),0_12px_32px_-8px_rgb(14_18_23/0.12)] [--card-spacing:--spacing(8)] max-sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="justify-items-center gap-2 text-center">
        <div className="mb-4">
          <Logo />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <CardFooter className="justify-center gap-1 border-t py-5 text-sm text-muted-foreground">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

export function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  const Icon = tone === "error" ? CircleAlertIcon : MailCheckIcon;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "flex items-start gap-2 rounded-lg bg-expense-soft px-3 py-2.5 text-sm text-destructive"
          : "flex items-start gap-2 rounded-lg bg-income-soft px-3 py-2.5 text-sm text-income"
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// Password input with a show/hide toggle and a Caps Lock warning.
export function PasswordInput(props: React.ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  return (
    <>
      <div className="relative">
        <Input
          name="password"
          required
          minLength={6}
          {...props}
          type={visible ? "text" : "password"}
          onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
          onBlur={() => setCapsLock(false)}
          className="h-10 pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>
      {capsLock && (
        <FieldDescription role="status" className="text-warning">
          Bloq Mayús está activado.
        </FieldDescription>
      )}
    </>
  );
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
      {pending && <LoaderCircleIcon className="animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}

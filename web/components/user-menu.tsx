"use client";

import { LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { signOut } from "@/app/(auth)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// "Mariana Ruiz" → "MR"; without a name, the first two letters of the email.
export const initials = (name: string | null, email: string) => {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return words.length
    ? words
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
    : email.slice(0, 2);
};

export function Avatar({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground uppercase md:size-7 ${className}`}
    >
      {label}
    </span>
  );
}

// Avatar (phones) or "Mi cuenta" row (sidebar) that opens the settings and sign-out menu.
export function UserMenu({
  email,
  name,
  compact = false,
}: {
  email: string;
  name: string | null;
  compact?: boolean;
}) {
  // The menu lives in the layout, so it stays mounted (and open) across navigations.
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Mi cuenta"
        className="flex min-w-0 items-center gap-2.5 rounded-md p-2.5 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-accent"
      >
        <Avatar label={initials(name, email)} />
        {!compact && (
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.8125rem] font-medium text-foreground">Mi cuenta</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={compact ? "end" : "start"}
        side={compact ? "bottom" : "top"}
        className="w-56"
      >
        <p className="truncate px-1 text-xs text-muted-foreground">{email}</p>
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "w-full justify-start",
          })}
        >
          <SettingsIcon /> Ajustes
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            <LogOutIcon /> Salir
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

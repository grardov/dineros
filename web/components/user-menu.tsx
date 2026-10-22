"use client";

import { LogOutIcon } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function Avatar({ email }: { email: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground uppercase md:size-7">
      {email.slice(0, 2)}
    </span>
  );
}

// Avatar (phones) or "Mi cuenta" row (sidebar) that opens the sign-out menu.
export function UserMenu({ email, compact = false }: { email: string; compact?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Mi cuenta"
        className="flex min-w-0 items-center gap-2.5 rounded-md p-2.5 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-accent"
      >
        <Avatar email={email} />
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
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            <LogOutIcon /> Salir
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { ArrowLeftRightIcon, HouseIcon, PlusIcon, TagsIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NewTransactionButton } from "@/components/transaction-list";

const LINKS = [
  { href: "/", label: "Resumen", icon: HouseIcon },
  { href: "/transactions", label: "Movimientos", icon: ArrowLeftRightIcon },
  { href: "/accounts", label: "Cuentas", icon: WalletIcon },
  { href: "/categories", label: "Categorías", icon: TagsIcon },
];

const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

// Vertical list in the sidebar from md up.
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors hover:bg-sidebar-accent ${
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "font-medium text-sidebar-foreground"
            }`}
          >
            <Icon className={`size-4 ${active ? "text-primary" : "text-[#6b7480]"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// Tab bar on phones, with "new transaction" in the middle. Lives inside the store provider.
export function MobileNav() {
  const pathname = usePathname();
  const tab = ({ href, label, icon: Icon }: (typeof LINKS)[number]) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href, pathname) ? "page" : undefined}
      className="flex flex-col items-center gap-1 text-[10.5px] font-medium text-[#6b7480] aria-[current=page]:text-primary"
    >
      <Icon className="size-[21px]" />
      {label}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-start border-t bg-card px-1 pt-2.5 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden">
      {LINKS.slice(0, 2).map(tab)}
      <div className="flex justify-center">
        <NewTransactionButton
          size="icon"
          aria-label="Nuevo movimiento"
          className="-mt-1 size-12 rounded-2xl shadow-[0_6px_16px_rgba(31,111,92,.35)]"
        >
          <PlusIcon className="size-6" />
        </NewTransactionButton>
      </div>
      {LINKS.slice(2).map(tab)}
    </nav>
  );
}

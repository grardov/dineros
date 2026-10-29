"use client";

import {
  ArrowLeftRightIcon,
  HeartPulseIcon,
  HouseIcon,
  PlusIcon,
  RepeatIcon,
  TagsIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NewTransactionButton } from "@/components/transaction-list";

type NavLink = {
  href: string;
  label: string;
  icon: typeof HouseIcon;
  sub?: { href: string; label: string }[];
};

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Resumen", icon: HouseIcon },
  { href: "/transactions", label: "Movimientos", icon: ArrowLeftRightIcon },
  { href: "/recurring", label: "Fijos", icon: RepeatIcon },
  { href: "/accounts", label: "Cuentas", icon: WalletIcon },
  { href: "/categories", label: "Categorías", icon: TagsIcon },
  {
    href: "/health",
    label: "Salud",
    icon: HeartPulseIcon,
    sub: [{ href: "/health/calculator", label: "Calculadora" }],
  },
];
// The phone tab bar fits four around "+": Categorías is reached from Resumen, Salud from the
// account menu.
const MOBILE = LINKS.filter((l) => l.href !== "/categories" && l.href !== "/health");

const isActive = (href: string, pathname: string) => pathname.startsWith(href);

// Vertical list in the sidebar from md up.
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map(({ href, label, icon: Icon, sub }) => {
        // On a sub-page, the sub-link is the one marked.
        const active = isActive(href, pathname) && !sub?.some((s) => isActive(s.href, pathname));
        return (
          <div key={href} className="flex flex-col gap-0.5">
            <Link
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
            {sub && (
              <div className="ml-[18px] flex flex-col gap-0.5 border-l border-sidebar-border pl-2.5">
                {sub.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    aria-current={isActive(s.href, pathname) ? "page" : undefined}
                    className="flex h-8 items-center rounded-md px-2.5 text-[0.8125rem] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-accent-foreground"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Tab bar on phones, with "new transaction" in the middle. Lives inside the store provider.
export function MobileNav() {
  const pathname = usePathname();
  const tab = ({ href, label, icon: Icon }: NavLink) => (
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
      {MOBILE.slice(0, 2).map(tab)}
      <div className="flex justify-center">
        <NewTransactionButton
          size="icon"
          aria-label="Nuevo movimiento"
          className="-mt-1 size-12 rounded-2xl shadow-[0_6px_16px_rgba(31,111,92,.35)]"
        >
          <PlusIcon className="size-6" />
        </NewTransactionButton>
      </div>
      {MOBILE.slice(2).map(tab)}
    </nav>
  );
}

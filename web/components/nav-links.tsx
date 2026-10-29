"use client";

import {
  ArrowLeftRightIcon,
  CalculatorIcon,
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
  sub?: NavLink[];
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
    sub: [{ href: "/health/calculator", label: "Calculadora", icon: CalculatorIcon }],
  },
];
// The phone tab bar fits four around "+": Categorías is reached from Resumen, Salud from the
// account menu.
const MOBILE = LINKS.filter((l) => l.href !== "/categories" && l.href !== "/health");

const isActive = (href: string, pathname: string) => pathname.startsWith(href);

function NavItem({ href, label, icon: Icon, active }: NavLink & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors hover:bg-sidebar-accent ${
        active
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "font-medium text-sidebar-foreground"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${active ? "text-primary" : "text-[#6b7480]"}`} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

// Vertical list in the sidebar from md up. Sub-links hang from their parent's icon on a line that
// curves into each one.
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map((link) => (
        <div key={link.href} className="flex flex-col gap-0.5">
          {/* On a sub-page, the sub-link is the one marked. */}
          <NavItem
            {...link}
            active={
              isActive(link.href, pathname) && !link.sub?.some((s) => isActive(s.href, pathname))
            }
          />
          {link.sub?.map((s) => (
            <div
              key={s.href}
              className="relative ml-[17px] pl-3.5 before:absolute before:-top-1 before:left-0 before:h-[calc(50%+4px)] before:w-3 before:rounded-bl-[7px] before:border-b before:border-l before:border-[#cfd4da] not-last:after:absolute not-last:after:inset-y-0 not-last:after:left-0 not-last:after:border-l not-last:after:border-[#cfd4da]"
            >
              <NavItem {...s} active={isActive(s.href, pathname)} />
            </div>
          ))}
        </div>
      ))}
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

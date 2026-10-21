"use client";

import { ArrowLeftRightIcon, HouseIcon, TagsIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio", icon: HouseIcon },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRightIcon },
  { href: "/cuentas", label: "Cuentas", icon: WalletIcon },
  { href: "/categorias", label: "Categorías", icon: TagsIcon },
];

// Tab bar on phones, vertical list in the sidebar from md up.
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="grid grid-cols-4 gap-1 md:flex md:flex-col">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-sidebar-accent md:flex-row md:gap-2 md:text-sm ${
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

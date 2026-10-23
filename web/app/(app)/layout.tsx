import { connection } from "next/server";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { MobileNav, NavLinks } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { getProfile, loadData } from "@/lib/data";
import { StoreProvider } from "@/lib/store";
import { createClient } from "@/lib/supabase";

async function User({ compact }: { compact?: boolean }) {
  // supabase-js reads Date.now() while building the client; keep it out of the prerender.
  await connection();
  const supabase = await createClient();
  const [{ data }, profile] = await Promise.all([supabase.auth.getClaims(), getProfile()]);
  return (
    <UserMenu email={data?.claims.email ?? ""} name={profile.display_name} compact={compact} />
  );
}

async function Data({ children }: { children: React.ReactNode }) {
  return <StoreProvider data={await loadData()}>{children}</StoreProvider>;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden flex-col gap-7 border-r bg-sidebar px-3 pt-5.5 pb-4 md:sticky md:top-0 md:flex md:h-svh md:w-56 md:shrink-0">
        <Logo />
        {/* usePathname on /cuentas/[id] is only known at request time */}
        <Suspense>
          <NavLinks />
        </Suspense>
        <div className="mt-auto border-t pt-2">
          <Suspense>
            <User />
          </Suspense>
        </div>
      </aside>
      <header className="flex items-center justify-between px-4 pt-3 md:hidden">
        <Logo />
        <Suspense>
          <User compact />
        </Suspense>
      </header>
      <main className="stagger mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-5 px-4 pt-4 pb-28 md:px-8 md:py-7">
        {/* The user's data loads at request time, so it streams in after the shell. */}
        <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
          <Data>
            {children}
            <MobileNav />
          </Data>
        </Suspense>
      </main>
    </div>
  );
}

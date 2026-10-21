import { LogOutIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { StoreProvider } from "@/lib/store";
import { createClient } from "@/lib/supabase";

import { signOut } from "../login/actions";

async function UserEmail() {
  // supabase-js reads Date.now() while building the client; keep it out of the prerender.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return <>{data?.claims.email}</>;
}

function SignOut() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOutIcon /> Salir
      </Button>
    </form>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col gap-3 border-b bg-sidebar p-3 text-sidebar-foreground md:sticky md:top-0 md:h-svh md:w-56 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-2 md:py-2">
          <Link href="/" className="font-semibold">
            Dineros
          </Link>
          <div className="md:hidden">
            <SignOut />
          </div>
        </div>
        {/* usePathname on /cuentas/[id] is only known at request time */}
        <Suspense>
          <NavLinks />
        </Suspense>
        <div className="mt-auto hidden flex-col items-start gap-1 border-t pt-3 md:flex">
          <span className="truncate px-2 text-xs text-muted-foreground">
            <Suspense>
              <UserEmail />
            </Suspense>
          </span>
          <SignOut />
        </div>
      </aside>
      <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-6 p-4 md:p-8">
        {/* The mock store reads today's date, so it renders at request time, not in the shell. */}
        <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
          <StoreProvider>{children}</StoreProvider>
        </Suspense>
      </main>
    </div>
  );
}

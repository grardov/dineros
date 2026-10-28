import { connection } from "next/server";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { MobileNav, NavLinks } from "@/components/nav-links";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

function NavSkeleton() {
  return (
    <div className="flex flex-col gap-0.5">
      {[16, 24, 12, 18, 22].map((w) => (
        <div key={w} className="flex h-9 items-center gap-2.5 px-2.5">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3" style={{ width: `${w * 4}px` }} />
        </div>
      ))}
    </div>
  );
}

function UserSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5">
      <Skeleton className="size-9 rounded-full md:size-7" />
      {!compact && (
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      )}
    </div>
  );
}

// The shape every page shares (header, figures, lists) while the user's data loads.
function PageSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-5">
      <span className="sr-only">Cargando tus finanzas…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.35fr_1fr] md:gap-4 xl:grid-cols-[1fr_1fr_1.3fr_1fr]">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {[6, 4].map((rows) => (
          <Card key={rows}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                  <Skeleton className="h-3.5 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden flex-col gap-7 border-r bg-sidebar px-3 pt-5.5 pb-4 md:sticky md:top-0 md:flex md:h-svh md:w-56 md:shrink-0">
        <Logo href="/dashboard" />
        {/* usePathname on /cuentas/[id] is only known at request time */}
        <Suspense fallback={<NavSkeleton />}>
          <NavLinks />
        </Suspense>
        <div className="mt-auto border-t pt-2">
          <Suspense fallback={<UserSkeleton />}>
            <User />
          </Suspense>
        </div>
      </aside>
      <header className="flex items-center justify-between px-4 pt-3 md:hidden">
        <Logo href="/dashboard" />
        <Suspense fallback={<UserSkeleton compact />}>
          <User compact />
        </Suspense>
      </header>
      <main className="stagger mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-5 px-4 pt-4 pb-28 md:px-8 md:py-7">
        {/* The user's data loads at request time, so it streams in after the shell. */}
        <Suspense fallback={<PageSkeleton />}>
          <Data>
            {children}
            <MobileNav />
          </Data>
        </Suspense>
      </main>
    </div>
  );
}

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase is used in web only for auth (session cookies); data always goes through core.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    // No browser client reads the session, so page scripts (or an XSS) can't either.
    cookieOptions: { httpOnly: true },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't set cookies; proxy.ts already refreshed the session.
        }
      },
    },
  });
}

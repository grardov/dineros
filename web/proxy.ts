import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session on every request and sends signed-out users to /login.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Verifies the JWT signature (JWKS), refreshing the token first if it expired.
  const { data } = await supabase.auth.getClaims();
  // Pin the issuer like core does: every local Supabase stack shares the same default signing
  // key, so a session cookie from another local project would otherwise pass.
  const signedIn = data?.claims.iss === `${process.env.SUPABASE_URL}/auth/v1`;
  // Email links (/auth/confirm) must work whether or not someone is already signed in.
  if (request.nextUrl.pathname.startsWith("/auth/")) return response;
  const onLogin = request.nextUrl.pathname.startsWith("/login");
  if (!signedIn && !onLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && onLogin) return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|apple-icon.png|institutions/).*)"],
};

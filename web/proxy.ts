import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session on every request; signed-out users only see the landing page
// and /login, signed-in ones skip both and go to /dashboard.
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
  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/" || pathname.startsWith("/login");
  if (!signedIn && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && isPublic) return NextResponse.redirect(new URL("/dashboard", request.url));
  return response;
}

export const config = {
  // Static and metadata files must reach crawlers and the install prompt without a session, and
  // Vercel Analytics (/_vercel/insights) must load on signed-out pages too.
  matcher: [
    "/((?!_next/static|_next/image|_vercel/|icon.svg|apple-icon.png|opengraph-image.png|manifest.webmanifest|robots.txt|institutions/|version$).*)",
  ],
};

import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase";

// Target of the password-recovery email: trades the one-time token for a session.
// Token hash (not PKCE) so the link also works when opened on another device.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  if (token_hash && type === "recovery") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL("/reset-password", request.url));
  }
  // ponytail: Supabase's default email template lands here with a PKCE code, which only works in the
  // browser that asked for the reset. Drop once production uses templates/recovery.html (needs custom SMTP).
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/reset-password", request.url));
  }
  return NextResponse.redirect(new URL("/login/forgot-password?error=expired-link", request.url));
}

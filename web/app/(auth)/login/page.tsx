import type { Metadata } from "next";

import { LoginForm } from "./login-form";

// The one public page: let search engines index it so the app can be found by name.
export const metadata: Metadata = { title: "Entrar", robots: { index: true, follow: false } };

export default function LoginPage() {
  return <LoginForm />;
}

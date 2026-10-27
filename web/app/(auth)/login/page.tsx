import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "./login-form";

// Public like the landing page: let search engines index it so the app can be found by name.
export const metadata: Metadata = { title: "Entrar", robots: { index: true, follow: false } };

// The landing page's "Crear cuenta" links here with ?mode=signup.
async function Form({ searchParams }: PageProps<"/login">) {
  const { mode } = await searchParams;
  return <LoginForm initialMode={mode === "signup" ? "signup" : "signin"} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginForm />}>
      <Form {...props} />
    </Suspense>
  );
}

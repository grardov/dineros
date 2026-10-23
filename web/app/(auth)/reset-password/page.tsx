import type { Metadata } from "next";

import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nueva contraseña · Dineros" };

export default function NewPasswordPage() {
  return <NewPasswordForm />;
}

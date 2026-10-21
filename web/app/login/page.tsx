import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 font-sans">
      <h1 className="text-3xl font-semibold">Dineros</h1>
      <LoginForm />
    </main>
  );
}

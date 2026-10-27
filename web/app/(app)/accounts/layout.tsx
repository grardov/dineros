import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cuentas" };

export default function Layout({ children }: LayoutProps<"/accounts">) {
  return children;
}

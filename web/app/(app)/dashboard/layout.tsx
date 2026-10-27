import type { Metadata } from "next";

export const metadata: Metadata = { title: "Resumen" };

export default function Layout({ children }: LayoutProps<"/dashboard">) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Movimientos" };

export default function Layout({ children }: LayoutProps<"/transactions">) {
  return children;
}

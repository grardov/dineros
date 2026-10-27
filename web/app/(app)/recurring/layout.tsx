import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fijos" };

export default function Layout({ children }: LayoutProps<"/recurring">) {
  return children;
}

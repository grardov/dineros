import type { Metadata } from "next";

export const metadata: Metadata = { title: "Categorías" };

export default function Layout({ children }: LayoutProps<"/categories">) {
  return children;
}

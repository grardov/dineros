import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Inter for page and card titles only; body text and amounts stay in Geist.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { template: "%s · Dineros", default: "Dineros" },
  description: "Lleva tus cuentas, tarjetas, gastos fijos y movimientos en un solo lugar.",
  applicationName: "Dineros",
  // Everything sits behind a login with private data; only /login opts back in.
  robots: { index: false, follow: false },
  appleWebApp: { title: "Dineros" },
  // Keep iOS from turning amounts and account numbers into phone links.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f6f7f9" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

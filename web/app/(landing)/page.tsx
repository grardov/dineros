import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CreditCardIcon,
  DownloadIcon,
  PlusIcon,
  ReceiptTextIcon,
  SmartphoneIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata, ResolvingMetadata } from "next";
import { cn } from "cn";
import Link from "next/link";

import { Amount } from "@/components/finance";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { money } from "@/lib/types";

import { FijosDemo } from "./fijos-demo";

const TITLE = "Dineros · Tus cuentas, tarjetas y fijos en un solo lugar";
const DESCRIPTION =
  "Dineros es una app gratis de finanzas personales para México: registra tus gastos e ingresos, controla tus tarjetas de crédito y planea tus gastos fijos.";
// The production domain on Vercel, so the canonical URL and JSON-LD never point at a preview.
const SITE = new URL(
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000",
);

// Signed-in visitors never see this page: the proxy sends them to /dashboard.
// openGraph and twitter replace the root layout's whole objects, share image included,
// so they build on the resolved parent instead.
export async function generateMetadata(
  _: PageProps<"/">,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { openGraph, twitter } = await parent;
  return {
    metadataBase: SITE,
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: { ...openGraph, type: "website", url: "/", title: TITLE, description: DESCRIPTION },
    twitter: { ...twitter, title: TITLE, description: DESCRIPTION },
  };
}

// Tells search engines what Dineros is: a free web app for personal finances.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Dineros",
  url: SITE.href,
  description: DESCRIPTION,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  inLanguage: "es-MX",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MXN" },
};

const SIGNUP = "/login?mode=signup";

const CATEGORIES = [
  { icon: "🛒", name: "Súper y despensa", amount: 8420.5, color: "#1f6f5c" },
  { icon: "🏠", name: "Vivienda", amount: 6500, color: "#3a8f78" },
  { icon: "🍽️", name: "Restaurantes", amount: 4180.3, color: "#5fae96" },
  { icon: "🚌", name: "Transporte", amount: 2915, color: "#8cc7b3" },
  { icon: "🎬", name: "Entretenimiento", amount: 1640, color: "#b8ddd0" },
];
const SPENT = 27415.8;

const EXTRAS = [
  {
    icon: ArrowLeftRightIcon,
    title: "Gastos, ingresos y transferencias",
    text: "Con categorías y subcategorías, etiquetas, notas y ubicación. Las transferencias entre tus cuentas no cuentan como gasto.",
  },
  {
    icon: WalletIcon,
    title: "Todas tus cuentas",
    text: "Débito, crédito, efectivo, ahorro e inversión, con el logo de tu banco: BBVA, Nu, Banorte, Mercado Pago y más.",
  },
  {
    icon: CopyIcon,
    title: "Tu CLABE, lista para enviar",
    text: "Guarda tu CLABE y tu número de cuenta y compártelos por WhatsApp sin abrir la app del banco.",
  },
  {
    icon: ReceiptTextIcon,
    title: "Datos para tu factura",
    text: "RFC, régimen fiscal y uso de CFDI guardados. Cuando te pidan factura, compártelos en vez de dictarlos.",
  },
  {
    icon: DownloadIcon,
    title: "Tus datos son tuyos",
    text: "Descarga todos tus movimientos en CSV cuando quieras, o borra tu cuenta y todo lo que guardaste.",
  },
  {
    icon: SmartphoneIcon,
    title: "En tu celular",
    text: "Funciona en cualquier navegador y la puedes agregar a tu pantalla de inicio como una app.",
  },
];

const container = "mx-auto w-full max-w-290 px-4 sm:px-6";
const feature = "grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-12";
const panel = "rounded-2xl border bg-background p-3 sm:p-6";
const card = "rounded-xl border bg-card p-4.5";

function FeatureText({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: string;
}) {
  return (
    <div className="flex max-w-115 flex-col gap-3.5">
      <span className="text-[13px] font-semibold text-primary">{eyebrow}</span>
      <h2 className="font-heading text-[clamp(28px,3.4vw,38px)] leading-[1.1] font-semibold tracking-[-.03em] text-balance">
        {title}
      </h2>
      <p className="text-[17px] leading-[1.55] text-sidebar-foreground text-pretty">{children}</p>
    </div>
  );
}

function HeroStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border p-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
        <div className={`${container} flex items-center gap-6 py-3.5`}>
          <Logo />
          <nav className="flex flex-1 gap-5 text-sm font-medium text-sidebar-foreground max-sm:hidden">
            <a href="#funciones">Funciones</a>
            <a href="#tarjetas">Tarjetas</a>
            <a href="#fijos">Fijos</a>
          </nav>
          <div className="ml-auto flex gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Entrar
            </Link>
            <Link href={SIGNUP} className={cn(buttonVariants())}>
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(#c3c8cf_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_50%_30%,black_15%,transparent_65%)] bg-size-[22px_22px]"
        />
        <div
          className={`${container} relative flex flex-col items-center gap-5.5 pt-22 text-center`}
        >
          <span className="flex h-7 items-center rounded-full bg-accent px-3 text-[13px] font-medium text-accent-foreground">
            Hecha para México · en pesos y en español
          </span>
          <h1 className="max-w-205 font-heading text-[clamp(40px,6vw,68px)] leading-[1.02] font-bold tracking-[-.035em] text-balance">
            Tus cuentas, tarjetas y fijos en un solo lugar.
          </h1>
          <p className="max-w-150 text-[clamp(17px,2vw,20px)] leading-[1.45] text-sidebar-foreground text-pretty">
            Registra lo que gastas y lo que te llega, sabe cuánto debes en cada tarjeta y cuánto vas
            a necesitar el próximo mes.
          </p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
            <Link href={SIGNUP} className={cn(buttonVariants({ size: "lg" }))}>
              Crear cuenta gratis
              <ArrowRightIcon />
            </Link>
            <a href="#funciones" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Ver funciones
            </a>
          </div>

          {/* A frozen Resumen, to show the app before signing up. */}
          <div className="mt-12 flex w-full max-w-260 flex-col gap-4 rounded-t-2xl border border-b-0 bg-card p-4 text-left shadow-[0_30px_70px_-30px_rgb(14_18_23/.3)] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] text-muted-foreground">
                  Hola, Mariana · Lunes 27 de octubre
                </span>
                <span className="font-heading text-[26px] leading-tight font-semibold tracking-tight">
                  Resumen
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-2.5 whitespace-nowrap">
                  <ChevronLeftIcon className="size-4 text-muted-foreground" />
                  Octubre de 2026
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </span>
                <span className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-primary-foreground sm:px-3.5">
                  <PlusIcon className="size-4" />
                  <span className="max-sm:hidden">Nuevo movimiento</span>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <HeroStat label="Patrimonio neto">
                <Amount value={184320.45} className="text-[26px]" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  Activos $201,870.45 · Deudas −$17,550.00
                </span>
              </HeroStat>
              <HeroStat label="Ingresos del mes">
                <Amount
                  value={42000}
                  className="text-[26px] text-income"
                  centsClassName="opacity-55"
                />
                <span className="text-xs font-medium text-income">+3.2% vs septiembre</span>
              </HeroStat>
              <HeroStat label="Gastos del mes">
                <Amount
                  value={SPENT}
                  className="text-[26px] text-expense"
                  centsClassName="opacity-55"
                />
                <span className="text-xs font-medium text-income">−6.8% vs septiembre</span>
              </HeroStat>
              <HeroStat label="Ahorro del mes">
                <Amount value={14584.2} className="text-[26px]" />
                <div className="flex items-center gap-2">
                  <div className="h-1.25 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-[34.7%] bg-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    34.7% de ingresos
                  </span>
                </div>
              </HeroStat>
            </div>
          </div>
        </div>
      </section>

      <main id="funciones" className="scroll-mt-16 border-t bg-card">
        <div className={`${container} flex flex-col gap-28 py-24`}>
          <div className={feature}>
            <FeatureText eyebrow="Resumen" title="Ve a dónde se fue tu mes.">
              Tu patrimonio, lo que entró, lo que salió y cuánto ahorraste, comparado con el mes
              anterior. Los gastos se agrupan por categoría, y las subcategorías suman a su
              categoría.
            </FeatureText>
            <div className={panel}>
              <div className={`${card} flex flex-col gap-3.5`}>
                <span className="font-heading text-[15px] font-semibold">Gastos por categoría</span>
                {CATEGORIES.map((c) => (
                  <div key={c.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span>{c.icon}</span>
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-auto font-semibold tabular-nums">{money(c.amount)}</span>
                      <span className="w-9 text-right text-xs text-subtle tabular-nums">
                        {Math.round((c.amount / SPENT) * 100)}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.amount / CATEGORIES[0].amount) * 100}%`,
                          background: c.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div id="tarjetas" className={`${feature} scroll-mt-24`}>
            <div className={`${panel} flex flex-col gap-3`}>
              <div className={`${card} flex flex-col gap-3.5`}>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-foreground text-card">
                    <CreditCardIcon className="size-4.5" />
                  </span>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">Nu Crédito</span>
                    <span className="text-xs text-muted-foreground">Corte día 12 · Pago día 2</span>
                  </div>
                  <span className="rounded-full bg-warning-soft px-2.25 py-1 text-xs font-medium text-warning">
                    Vence el 2 nov · en 6 días
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] text-muted-foreground">Saldo actual (debes)</span>
                    <Amount value={12480.6} className="text-[28px]" />
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[13px] text-muted-foreground">Disponible</span>
                    <span className="text-[17px] font-semibold tabular-nums">{money(27519.4)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-[31%] rounded-full bg-[#d08a1f]" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                    <span>31% de tu línea</span>
                    <span>Límite $40,000.00</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1 rounded-[10px] border border-[#c9ddd7] bg-[#f3f8f6] p-3 text-accent-foreground">
                  <span className="text-xs">Para no generar intereses</span>
                  <span className="text-[15px] font-semibold tabular-nums">{money(8920.35)}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-[10px] border bg-card p-3">
                  <span className="text-xs text-muted-foreground">Pagado</span>
                  <span className="text-[15px] font-semibold tabular-nums">{money(3000)}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-[10px] border bg-card p-3">
                  <span className="text-xs text-muted-foreground">Te faltan</span>
                  <span className="text-[15px] font-semibold tabular-nums">{money(5920.35)}</span>
                </div>
              </div>
            </div>
            <FeatureText eyebrow="Tarjetas de crédito" title="Paga a tiempo y sin intereses.">
              Con tu día de corte y de pago, Dineros arma tus estados de cuenta: cuánto pagar para
              no generar intereses, cuánto llevas pagado y cuánto usas de tu línea.
            </FeatureText>
          </div>

          <div id="fijos" className={`${feature} scroll-mt-24`}>
            <FeatureText eyebrow="Fijos" title="Sabe cuánto vas a necesitar el próximo mes.">
              Renta, luz, nómina, el pago de la tarjeta o tu ahorro: agrégalos una vez, mensuales,
              bimestrales o anuales. Cuando llegan, los registras con un toque. Si el monto cambia,
              lo estimamos por ti.
            </FeatureText>
            <div className={panel}>
              <FijosDemo />
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex max-w-155 flex-col gap-2.5">
              <span className="text-[13px] font-semibold text-primary">Y también</span>
              <h2 className="font-heading text-[clamp(28px,3.4vw,38px)] leading-[1.1] font-semibold tracking-[-.03em] text-balance">
                Lo que te piden a diario, a la mano.
              </h2>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4">
              {EXTRAS.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex flex-col gap-3 rounded-[14px] border bg-card p-5.5"
                >
                  <span className="grid size-10 place-items-center rounded-[11px] bg-accent text-accent-foreground">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="font-heading text-[17px] leading-tight font-semibold tracking-[-.01em]">
                    {title}
                  </span>
                  <span className="text-sm leading-normal text-muted-foreground text-pretty">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <section className="bg-primary">
        <div className={`${container} flex flex-wrap items-center justify-between gap-8 py-20`}>
          <div className="flex max-w-140 flex-col gap-3">
            <h2 className="font-heading text-[clamp(30px,4vw,44px)] leading-[1.05] font-bold tracking-[-.035em] text-white text-balance">
              Empieza en dos minutos.
            </h2>
            <p className="text-[17px] leading-normal text-[#d4ebe3] text-pretty">
              Te pedimos tu nombre, tu primera cuenta y listo. Las categorías más comunes ya vienen
              preparadas.
            </p>
          </div>
          <Link
            href={SIGNUP}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 bg-card text-base text-accent-foreground hover:bg-accent",
            )}
          >
            Crear cuenta gratis
            <ArrowRightIcon />
          </Link>
        </div>
      </section>

      <footer className="border-t">
        <div
          className={`${container} flex flex-wrap items-center justify-between gap-4 py-7 text-[13px] text-muted-foreground`}
        >
          <span>© 2026 Dineros</span>
          <Link href="/login" className="hover:text-foreground">
            Entrar
          </Link>
        </div>
      </footer>
    </div>
  );
}

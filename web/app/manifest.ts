import type { MetadataRoute } from "next";

// Lets phones install Dineros to the home screen and open it without browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dineros",
    short_name: "Dineros",
    description: "Lleva tus cuentas, tarjetas, gastos fijos y movimientos en un solo lugar.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#f6f7f9",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Local Supabase's site_url is 127.0.0.1:3000, so auth email links can land there in dev.
  allowedDevOrigins: ["127.0.0.1"],
  // No framing (clickjacking on "Eliminar cuenta" and friends) and no MIME sniffing.
  // ponytail: no full CSP yet; it needs per-request nonces for Next's inline scripts.
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

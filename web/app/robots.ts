import type { MetadataRoute } from "next";

// Only the landing and login pages are public; the rest redirects there or holds someone's finances.
export default function robots(): MetadataRoute.Robots {
  // Link-preview bots honor robots.txt too, so the share image has to stay fetchable.
  return {
    rules: { userAgent: "*", allow: ["/$", "/login$", "/opengraph-image"], disallow: "/" },
  };
}

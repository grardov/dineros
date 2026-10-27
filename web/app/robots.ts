import type { MetadataRoute } from "next";

// Only the login page is public; the rest redirects there or holds someone's finances.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/login$", disallow: "/" } };
}

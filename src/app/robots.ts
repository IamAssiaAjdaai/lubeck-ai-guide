import type { MetadataRoute } from "next";

import { CITYWALK_PUBLIC_ORIGIN } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/account/",
        "/landing-preview",
      ],
    },
    sitemap: `${CITYWALK_PUBLIC_ORIGIN}/sitemap.xml`,
    host: CITYWALK_PUBLIC_ORIGIN,
  };
}

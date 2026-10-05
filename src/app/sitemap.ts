import type { MetadataRoute } from "next";

import { CITYWALK_PUBLIC_ORIGIN } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: CITYWALK_PUBLIC_ORIGIN,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

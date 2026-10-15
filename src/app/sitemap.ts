import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { getLegalOperator } from "@/lib/legal";
import { CITYWALK_PUBLIC_ORIGIN, citywalkPublicUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const operator = getLegalOperator();
  const routes: MetadataRoute.Sitemap = [
    {
      url: CITYWALK_PUBLIC_ORIGIN,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: citywalkPublicUrl("/support"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: citywalkPublicUrl("/account-deletion"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  if (operator.isConfigured) {
    routes.push(
      {
        url: citywalkPublicUrl("/privacy"),
        changeFrequency: "monthly",
        priority: 0.4,
      },
      {
        url: citywalkPublicUrl("/terms"),
        changeFrequency: "monthly",
        priority: 0.4,
      },
      {
        url: citywalkPublicUrl("/imprint"),
        changeFrequency: "monthly",
        priority: 0.4,
      },
    );
  }

  return routes;
}

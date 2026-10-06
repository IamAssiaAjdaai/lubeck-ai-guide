import { describe, expect, it } from "vitest";

import { metadata as homeMetadata } from "@/app/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { CITYWALK_PUBLIC_ORIGIN, citywalkPublicUrl } from "@/lib/site";

describe("production landing shell", () => {
  it("uses the canonical CITYWALK public origin", () => {
    expect(CITYWALK_PUBLIC_ORIGIN).toBe("https://getcitywalk.com");
    expect(citywalkPublicUrl("/sitemap.xml")).toBe("https://getcitywalk.com/sitemap.xml");
  });

  it("publishes canonical and social metadata for the homepage", () => {
    expect(homeMetadata.alternates).toEqual({ canonical: "/" });
    expect(homeMetadata.robots).toEqual({ index: true, follow: true });
    expect(homeMetadata.openGraph).toMatchObject({
      type: "website",
      url: CITYWALK_PUBLIC_ORIGIN,
      siteName: "CITYWALK",
    });
    expect(homeMetadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("keeps internal and preview surfaces out of crawler access", () => {
    const config = robots();
    expect(config.sitemap).toBe("https://getcitywalk.com/sitemap.xml");
    expect(config.host).toBe(CITYWALK_PUBLIC_ORIGIN);
    expect(config.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/account/", "/landing-preview"],
    });
  });

  it("advertises the public deletion resource while withholding unconfigured legal pages", () => {
    expect(sitemap()).toEqual([
      {
        url: CITYWALK_PUBLIC_ORIGIN,
        changeFrequency: "weekly",
        priority: 1,
      },
      {
        url: citywalkPublicUrl("/account-deletion"),
        changeFrequency: "monthly",
        priority: 0.5,
      },
    ]);
  });
});

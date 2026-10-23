import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

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
    expect(homeMetadata.alternates).toEqual({ canonical: "https://getcitywalk.com/" });
    expect(homeMetadata.robots).toEqual({ index: true, follow: true });
    expect(homeMetadata.openGraph).toMatchObject({
      type: "website",
      url: "https://getcitywalk.com/",
      siteName: "CITYWALK",
    });
    expect(homeMetadata.title).toBe("CITYWALK — Make every city your own");
    expect(homeMetadata.openGraph).toMatchObject({
      title: homeMetadata.title,
      description: homeMetadata.description,
      images: [{ url: "https://getcitywalk.com/brand/citywalk-home-og.png", width: 1200, height: 630, alt: homeMetadata.title }],
    });
    expect(homeMetadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [{ url: "https://getcitywalk.com/brand/citywalk-home-og.png", alt: homeMetadata.title }],
    });
  });

  it("keeps internal and preview surfaces out of crawler access", () => {
    const config = robots();
    expect(config.sitemap).toBe("https://getcitywalk.com/sitemap.xml");
    expect(config.host).toBe(CITYWALK_PUBLIC_ORIGIN);
    expect(config.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/account/", "/landing-preview", "/landing-next-preview"],
    });
  });

  it("advertises the public deletion resource while withholding unconfigured legal pages", async () => {
    expect(await sitemap()).toEqual([
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
    ]);
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  getPublishedMarketingPageByPath: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/marketing/publicRepository.server", () => ({
  getPublishedMarketingPageByPath: mocks.getPublishedMarketingPageByPath,
}));
vi.mock("@/components/marketing/MarketingLandingTracker", () => ({
  default: ({
    ctaHref,
    ctaLabel,
  }: {
    ctaHref?: string;
    ctaLabel?: string;
  }) =>
    ctaHref && ctaLabel ? <a href={ctaHref}>{ctaLabel}</a> : null,
}));

import MarketingPage, {
  generateMetadata,
} from "@/app/lubeck/[marketingSlug]/page";

describe("public Marketing page", () => {
  beforeEach(() => {
    mocks.connection.mockResolvedValue(undefined);
    mocks.getPublishedMarketingPageByPath.mockResolvedValue(publishedPage());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders CMS-authored published content and forwards UTM attribution to the planner", async () => {
    render(
      await MarketingPage({
        params: Promise.resolve({ marketingSlug: "2-hours" }),
        searchParams: Promise.resolve({
          utm_source: "instagram",
          utm_medium: "social",
          utm_campaign: "two-hours-in-lubeck",
          utm_content: "CW-LUB-TIME-001",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "2 Hours in Lübeck? Let CITYWALK build the walk.",
        level: 1,
      }),
    ).not.toBeNull();
    expect(
      screen.getByText(/Two hours in Lübeck can still become a real city walk/),
    ).not.toBeNull();

    const cta = screen.getByRole("link", { name: "Build my walk" });
    expect(cta.getAttribute("href")).toBe(
      "/en/lubeck?utm_source=instagram&utm_medium=social&utm_campaign=two-hours-in-lubeck&utm_content=CW-LUB-TIME-001",
    );
    expect(mocks.getPublishedMarketingPageByPath).toHaveBeenCalledWith(
      "/lubeck/2-hours",
    );
    expect(mocks.connection).toHaveBeenCalled();
  });

  it("returns not found when no published Marketing page exists", async () => {
    mocks.getPublishedMarketingPageByPath.mockResolvedValue(undefined);

    await expect(
      MarketingPage({
        params: Promise.resolve({ marketingSlug: "draft-page" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("uses CMS SEO fields and the clean public path as canonical metadata", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ marketingSlug: "2-hours" }),
      }),
    ).resolves.toMatchObject({
      title: "2 Hours in Lübeck | CITYWALK",
      description:
        "Short on time in Lübeck? Tell CITYWALK your time window and get a walk built around it.",
      alternates: {
        canonical: "https://getcitywalk.com/lubeck/2-hours",
      },
      openGraph: {
        url: "https://getcitywalk.com/lubeck/2-hours",
        siteName: "CITYWALK",
        type: "website",
      },
    });
  });
});

function publishedPage() {
  return {
    id: 10,
    kind: "landing" as const,
    slug: "2-hours",
    path: "/lubeck/2-hours",
    title: "2 Hours in Lübeck? Let CITYWALK build the walk.",
    body:
      "Two hours in Lübeck can still become a real city walk. Tell CITYWALK how much time you have and when you need to be back.",
    seoTitle: "2 Hours in Lübeck | CITYWALK",
    seoDescription:
      "Short on time in Lübeck? Tell CITYWALK your time window and get a walk built around it.",
    cta: "Build my walk",
    city: {
      slug: "lubeck",
      name: "Lübeck",
    },
    campaign: {
      slug: "two-hours-in-lubeck",
    },
  };
}

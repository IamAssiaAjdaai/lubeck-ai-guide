import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  getContentSource: vi.fn(),
  getPublicCitySummaries: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => ({ value: "en" }),
  })),
}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/lib/content/source", () => ({
  getContentSource: mocks.getContentSource,
}));
vi.mock("@/lib/content/publicRepository.server", () => ({
  getPublicCitySummaries: mocks.getPublicCitySummaries,
  resolvePublicLocalization: <T,>(content: Record<string, T>, requestedLocale: string) => {
    const resolvedLocale = content[requestedLocale] ? requestedLocale : "en";
    const resolved = content[resolvedLocale];
    return resolved
      ? { requestedLocale, resolvedLocale, didFallback: resolvedLocale !== requestedLocale, content: resolved }
      : undefined;
  },
}));
vi.mock("@/components/LanguageSelector", () => ({
  default: () => <div data-testid="language-selector" />,
}));
vi.mock("@/components/travel/CityHero", () => ({
  default: ({ image }: { image: string }) => <div data-hero-image={image} data-testid="brand-hero" />,
}));
vi.mock("@/components/travel/CityCard", () => ({
  FeaturedCityCard: ({ image, name, description, href, actionLabel, contentLocale, contentDirection }: {
    image?: string;
    name: string;
    description?: string;
    href: string;
    actionLabel: string;
    contentLocale: string;
    contentDirection: string;
  }) => (
    <article data-image={image} data-testid="featured-city" lang={contentLocale} dir={contentDirection}>
      <h2>{name}</h2>
      {description ? <p>{description}</p> : null}
      <a href={href}>{actionLabel}</a>
    </article>
  ),
}));

import Home from "@/app/page";
import { brandHeroImage, cities } from "@/data/cities";
import { getTranslations, locales } from "@/lib/i18n";
import type { PublicMedia } from "@/lib/media/types";

const cardMedia: PublicMedia = { assetKey: "card", kind: "image", purpose: "card", url: "/api/media/card", mimeType: "image/jpeg" };
const heroMedia: PublicMedia = { assetKey: "hero", kind: "image", purpose: "hero", url: "/api/media/hero", mimeType: "image/jpeg" };

describe("Home available cities", () => {
  beforeEach(() => {
    mocks.connection.mockResolvedValue(undefined);
    mocks.getContentSource.mockReturnValue("database");
    mocks.getPublicCitySummaries.mockResolvedValue([summary([])]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("prefers approved city card media over hero media", async () => {
    mocks.getPublicCitySummaries.mockResolvedValue([summary([heroMedia, cardMedia])]);
    await renderHome();
    expect(featuredImage()).toBe(cardMedia.url);
    expect(screen.getByTestId("brand-hero").getAttribute("data-hero-image")).toBe(brandHeroImage);
  });

  it("uses approved hero media when card media is absent", async () => {
    mocks.getPublicCitySummaries.mockResolvedValue([summary([heroMedia])]);
    await renderHome();
    expect(featuredImage()).toBe(heroMedia.url);
  });

  it("keeps the legacy image when the public city has no eligible CMS media", async () => {
    await renderHome();
    expect(featuredImage()).toBe(cities.lubeck.heroImage);
  });

  it.each(["pending", "rejected", "archived", "unpublished", "unattached"])(
    "keeps the legacy image when %s media is excluded from the public summaries",
    async () => {
      await renderHome();
      expect(featuredImage()).toBe(cities.lubeck.heroImage);
    },
  );

  it("keeps code-source behavior static even if an invalid caller supplies CMS media", async () => {
    mocks.getContentSource.mockReturnValue("code");
    mocks.getPublicCitySummaries.mockResolvedValue([summary([cardMedia])]);
    await renderHome();
    expect(featuredImage()).toBe(cities.lubeck.heroImage);
    expect(mocks.connection).not.toHaveBeenCalled();
    expect(mocks.getPublicCitySummaries).toHaveBeenCalledWith("code");
  });

  it("opts into request-time rendering for database and auto content", async () => {
    for (const source of ["database", "auto"] as const) {
      mocks.getContentSource.mockReturnValue(source);
      await renderHome();
      expect(mocks.connection).toHaveBeenCalledTimes(1);
      cleanup();
      mocks.connection.mockClear();
    }
  });

  it("targets Available Cities with one localized primary discovery action", async () => {
    await renderHome();
    const hero = screen.getByTestId("brand-hero");
    const action = screen.getByTestId("home-primary-action");
    const featuredCity = screen.getByTestId("featured-city");

    expect(action.tagName).toBe("A");
    expect(action.getAttribute("href")).toBe("#available-cities");
    expect(action.className).toContain("button-primary");
    expect(screen.getAllByRole("link", { name: getTranslations("en").home.discoverCity })).toHaveLength(1);
    expect(hero.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(action.compareDocumentPosition(featuredCity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(getTranslations("en").common.noSignUp)).not.toBeNull();
    expect(screen.getByRole("heading", { name: getTranslations("en").home.availableCities })).not.toBeNull();
  });

  it("renders Lübeck as the currently published available city", async () => {
    await renderHome();
    expect(screen.getByTestId("available-city-lubeck").className).toContain("max-w-[22.5rem]");
    expect(screen.getByRole("heading", { name: "Lübeck" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Explore Lübeck" }).getAttribute("href")).toBe("/en/lubeck");
  });

  it("renders multiple published cities through the same card model", async () => {
    mocks.getPublicCitySummaries.mockResolvedValue([
      summary([], "lubeck", "Lübeck"),
      summary([], "ghent", "Ghent", "A published city description."),
    ]);
    await renderHome();

    expect(screen.getAllByTestId("featured-city")).toHaveLength(2);
    expect(screen.getByTestId("available-city-lubeck")).not.toBeNull();
    expect(screen.getByTestId("available-city-ghent")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Explore Ghent" })).not.toBeNull();
    expect(screen.getByText("A published city description.")).not.toBeNull();
  });

  it("does not fabricate missing descriptions or show fake Coming Soon cities", async () => {
    mocks.getPublicCitySummaries.mockResolvedValue([summary([], "ghent", "Ghent", "")]);
    await renderHome();

    expect(screen.queryByText(/Barcelona|Amsterdam|Paris/)).toBeNull();
    expect(screen.queryByText(getTranslations("en").home.featuredCityDescription)).toBeNull();
  });

  it("defines discovery copy for every supported locale", () => {
    for (const locale of locales) {
      const home = getTranslations(locale).home;
      expect(home.discoverCity.trim()).not.toBe("");
      expect(home.availableCities.trim()).not.toBe("");
      expect(home.exploreCity).toContain("{city}");
    }
  });
});

async function renderHome() {
  render(await Home());
}

function featuredImage(): string | null {
  return screen.getByTestId("featured-city").getAttribute("data-image");
}

function summary(media: readonly PublicMedia[], slug = "lubeck", name = "Lübeck", shortDescription = "Published city description.") {
  return {
    city: { slug, content: { en: { name, ...(shortDescription ? { shortDescription } : {}) } } },
    media,
  };
}

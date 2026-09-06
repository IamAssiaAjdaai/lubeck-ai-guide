import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  getContentSource: vi.fn(),
  getPublicCitySnapshot: vi.fn(),
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
  getPublicCitySnapshot: mocks.getPublicCitySnapshot,
}));
vi.mock("@/components/LanguageSelector", () => ({
  default: () => <div data-testid="language-selector" />,
}));
vi.mock("@/components/travel/CityHero", () => ({
  default: ({ image }: { image: string }) => (
    <div data-hero-image={image} data-testid="brand-hero" />
  ),
}));
vi.mock("@/components/travel/CityCard", () => ({
  FeaturedCityCard: ({ image }: { image: string }) => (
    <div data-image={image} data-testid="featured-city" />
  ),
  ComingSoonCityCard: ({ name }: { name: string }) => <div>{name}</div>,
}));

import Home from "@/app/page";
import { brandHeroImage, cities } from "@/data/cities";
import type { PublicMedia } from "@/lib/media/types";

const cardMedia: PublicMedia = {
  assetKey: "card",
  kind: "image",
  purpose: "card",
  url: "/api/media/card",
  mimeType: "image/jpeg",
};
const heroMedia: PublicMedia = {
  assetKey: "hero",
  kind: "image",
  purpose: "hero",
  url: "/api/media/hero",
  mimeType: "image/jpeg",
};

describe("Home public city media", () => {
  beforeEach(() => {
    mocks.connection.mockResolvedValue(undefined);
    mocks.getContentSource.mockReturnValue("database");
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot([]));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("prefers approved city card media over hero media", async () => {
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot([heroMedia, cardMedia]));
    await renderHome();
    expect(featuredImage()).toBe(cardMedia.url);
    expect(screen.getByTestId("brand-hero").getAttribute("data-hero-image")).toBe(brandHeroImage);
  });

  it("uses approved hero media when card media is absent", async () => {
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot([heroMedia]));
    await renderHome();
    expect(featuredImage()).toBe(heroMedia.url);
  });

  it("keeps the legacy image when the public snapshot has no eligible city media", async () => {
    await renderHome();
    expect(featuredImage()).toBe(cities.lubeck.heroImage);
  });

  it.each(["pending", "rejected", "archived", "unpublished", "unattached"])(
    "keeps the legacy image when %s media is excluded from the public snapshot",
    async () => {
      await renderHome();
      expect(featuredImage()).toBe(cities.lubeck.heroImage);
    },
  );

  it("keeps code-source behavior static even if an invalid caller supplies CMS media", async () => {
    mocks.getContentSource.mockReturnValue("code");
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot([cardMedia]));
    await renderHome();
    expect(featuredImage()).toBe(cities.lubeck.heroImage);
    expect(mocks.connection).not.toHaveBeenCalled();
    expect(mocks.getPublicCitySnapshot).toHaveBeenCalledWith("lubeck", "code");
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
});

async function renderHome() {
  render(await Home());
}

function featuredImage(): string | null {
  return screen.getByTestId("featured-city").getAttribute("data-image");
}

function snapshot(media: readonly PublicMedia[]) {
  return {
    city: { slug: "lubeck", content: { en: { name: "Lübeck" } } },
    places: [],
    tours: [],
    media: { city: media, places: {}, tours: {} },
  };
}

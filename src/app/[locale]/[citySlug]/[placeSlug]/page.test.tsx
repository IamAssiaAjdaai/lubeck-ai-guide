import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audioPlayer: vi.fn(),
  connection: vi.fn(),
  getContentSource: vi.fn(),
  getPublicCitySnapshot: vi.fn(),
  getGuideEligibility: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));
vi.mock("@/components/AudioPlayer", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.audioPlayer(props);
    return <div data-testid="audio-player" />;
  },
}));
vi.mock("@/lib/content/source", () => ({
  getContentSource: mocks.getContentSource,
}));
vi.mock("@/lib/guideEligibility.server", () => ({
  getGuideEligibility: mocks.getGuideEligibility,
}));
vi.mock("@/lib/content/publicRepository.server", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/content/publicRepository.server")
  >("@/lib/content/publicRepository.server");
  return {
    ...actual,
    getPublicCitySnapshot: mocks.getPublicCitySnapshot,
  };
});

import { GenericPlaceContent } from "@/app/[locale]/[citySlug]/[placeSlug]/page";

describe("generic public place detail", () => {
  beforeEach(() => {
    mocks.connection.mockResolvedValue(undefined);
    mocks.getContentSource.mockReturnValue("database");
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot());
    mocks.getGuideEligibility.mockResolvedValue(false);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the published place revision with its rich optional content", async () => {
    render(await renderPage("en", "gravensteen"));

    expect(screen.getByRole("heading", { name: "Published castle", level: 1 })).not.toBeNull();
    expect(screen.getByText("Published description.")).not.toBeNull();
    expect(screen.getByText("Respect the marked visitor route.")).not.toBeNull();
    expect(screen.getByText("Published story.")).not.toBeNull();
    expect(screen.getByText("Built")).not.toBeNull();
    expect(screen.getByText("1180")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Published castle" }).getAttribute("src"))
      .toBe("/api/media/castle-hero");
    expect(screen.getByText(/Photo: Castle Photographer/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "https://example.com/castle" }))
      .not.toBeNull();
    expect(screen.getByRole("link", { name: "Back" }).getAttribute("href"))
      .toBe("/en/ghent");
    expect(screen.queryByText("Working draft v2")).toBeNull();
    expect(screen.queryByText("Ask your local guide")).toBeNull();
  });

  it("passes only exact-locale live audio to AudioPlayer", async () => {
    render(await renderPage("en", "gravensteen"));

    expect(screen.getByTestId("audio-player")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Audio guide · 1:27" })).not.toBeNull();
    expect(mocks.audioPlayer).toHaveBeenCalledWith(expect.objectContaining({
      src: "/api/media/castle-audio-en",
      city: "ghent",
      landmark: "gravensteen",
      locale: "en",
    }));
  });

  it("shows the generic guide only when server eligibility is true", async () => {
    mocks.getGuideEligibility.mockResolvedValue(true);
    render(await renderPage("en", "gravensteen"));

    expect(screen.getByRole("button", { name: "Ask your local guide" })).not.toBeNull();
    expect(mocks.getGuideEligibility).toHaveBeenCalledWith(expect.objectContaining({
      citySlug: "ghent",
      placeSlug: "gravensteen",
      source: "database",
    }));
  });

  it.each(["de", "ar"] as const)(
    "does not use English audio for the %s page",
    async (locale) => {
      render(await renderPage(locale, "gravensteen"));

      expect(screen.queryByTestId("audio-player")).toBeNull();
      expect(mocks.audioPlayer).not.toHaveBeenCalled();
    },
  );

  it("omits absent story, facts, visitor notes, image, and audio cleanly", async () => {
    render(await renderPage("en", "minimal-place"));

    expect(screen.getByRole("heading", { name: "Minimal place", level: 1 })).not.toBeNull();
    expect(screen.getByText("Only a short description.")).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "The Story" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Quick Facts" })).toBeNull();
    expect(screen.queryByTestId("audio-player")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("keeps Arabic interface and authored content RTL", async () => {
    render(await renderPage("ar", "arabic-place"));

    const heading = screen.getByRole("heading", { name: "مكان عربي", level: 1 });
    expect(document.querySelector("main")?.getAttribute("dir")).toBe("rtl");
    expect(heading.closest("[lang]")?.getAttribute("lang")).toBe("ar");
    expect(heading.closest("[dir]")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses semantic LTR for English fallback inside an Arabic interface", async () => {
    render(await renderPage("ar", "gravensteen"));

    const heading = screen.getByRole("heading", { name: "Published castle", level: 1 });
    expect(document.querySelector("main")?.getAttribute("dir")).toBe("rtl");
    expect(heading.closest("[lang]")?.getAttribute("lang")).toBe("en");
    expect(heading.closest("[dir]")?.getAttribute("dir")).toBe("ltr");
  });

  it.each(["draft-only", "in-review-only", "unknown"])(
    "returns not found when %s is absent from the public snapshot",
    async (placeSlug) => {
      await expect(renderPage("en", placeSlug)).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mocks.notFound).toHaveBeenCalledOnce();
    },
  );

  it("returns not found for an unknown or unpublished city", async () => {
    mocks.getPublicCitySnapshot.mockRejectedValue(new Error("unavailable"));

    await expect(renderPage("en", "gravensteen", "unknown-city"))
      .rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns not found for an invalid locale before reading public content", async () => {
    await expect(renderPage("xx", "gravensteen")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.getPublicCitySnapshot).not.toHaveBeenCalled();
    expect(mocks.connection).not.toHaveBeenCalled();
  });
});

function renderPage(locale: string, placeSlug: string, citySlug = "ghent") {
  return GenericPlaceContent({
    params: Promise.resolve({ locale, citySlug, placeSlug }),
  });
}

function snapshot() {
  return {
    city: {
      slug: "ghent",
      content: { en: { name: "Ghent" } },
    },
    places: [
      {
        slug: "gravensteen",
        city: "ghent",
        category: "see",
        coordinates: { lat: 51.057, lng: 3.721 },
        durationMinutes: 45,
        environment: "mixed",
        pricing: "paid",
        tags: ["history"],
        content: {
          en: {
            name: "Published castle",
            shortDescription: "Published short description.",
            description: "Published description.",
            story: "Published story.",
            visitNote: "Respect the marked visitor route.",
            facts: [{ label: "Built", value: "1180" }],
          },
        },
      },
      {
        slug: "minimal-place",
        city: "ghent",
        category: "fun",
        coordinates: { lat: 51.058, lng: 3.722 },
        durationMinutes: 20,
        environment: "outdoor",
        pricing: "free",
        tags: [],
        content: {
          en: {
            name: "Minimal place",
            shortDescription: "Only a short description.",
          },
        },
      },
      {
        slug: "arabic-place",
        city: "ghent",
        category: "see",
        coordinates: { lat: 51.059, lng: 3.723 },
        durationMinutes: 15,
        environment: "indoor",
        pricing: "unknown",
        tags: [],
        content: {
          ar: {
            name: "مكان عربي",
            shortDescription: "وصف عربي.",
          },
        },
      },
    ],
    tours: [],
    media: {
      city: [],
      places: {
        gravensteen: [
          {
            assetKey: "castle-hero",
            kind: "image",
            purpose: "hero",
            url: "/api/media/castle-hero",
            mimeType: "image/jpeg",
            attribution: {
              creator: "Castle Photographer",
              text: "Photo: Castle Photographer · https://example.com/castle · CC BY-SA 4.0",
            },
          },
          {
            assetKey: "castle-audio-en",
            kind: "audio",
            purpose: "audio",
            url: "/api/media/castle-audio-en",
            mimeType: "audio/mpeg",
            durationSeconds: 87,
            locale: "en",
          },
        ],
      },
      tours: {},
    },
  };
}
